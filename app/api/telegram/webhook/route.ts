import { NextRequest, NextResponse } from "next/server";
import type Anthropic from "@anthropic-ai/sdk";
import { createAdminClient } from "@/lib/supabase/server";
import { runOrchestrator } from "@/lib/ai-department/orchestrator";
import { repairDanglingToolUse } from "@/lib/ai-department/repair";
import { sendTelegramMessage } from "@/lib/telegram/client";

type TelegramUpdate = {
  message?: {
    chat: { id: number };
    text?: string;
  };
};

/**
 * Telegram calls this on every incoming message once the webhook is
 * registered (see connectTelegramWebhook in telegram-actions.ts). There is
 * no logged-in admin session on a webhook request — instead of requireAdmin(),
 * access is gated by the chat_id claimed once via /start <TELEGRAM_SETUP_CODE>
 * and stored in ai_telegram_settings, so this route trusts that DB row
 * instead of a cookie.
 */
export async function POST(request: NextRequest) {
  const secret = process.env.TELEGRAM_WEBHOOK_SECRET;
  if (!secret || request.headers.get("x-telegram-bot-api-secret-token") !== secret) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const update = (await request.json()) as TelegramUpdate;
  const text = update.message?.text?.trim();
  const chatId = update.message?.chat.id;
  if (!text || !chatId) return NextResponse.json({ ok: true });

  const admin = await createAdminClient();

  if (text.startsWith("/start")) {
    const code = text.split(/\s+/)[1];
    if (code && code === process.env.TELEGRAM_SETUP_CODE) {
      // Supabase requires a filter on delete — this matches every row, since
      // re-claiming the code should replace whichever chat_id was linked before.
      await admin.from("ai_telegram_settings").delete().gte("linked_at", "1900-01-01");
      await admin.from("ai_telegram_settings").insert({ chat_id: chatId });
      await sendTelegramMessage(
        chatId,
        "✅ Ulandi! Endi menga to'g'ridan-to'g'ri yozishingiz mumkin — xabaringiz Bosh mutaxassisga (orchestrator) boradi va u kerakli mutaxassisga topshiradi.",
      );
    } else {
      await sendTelegramMessage(chatId, "Noto'g'ri kod. Administrator paneldan to'g'ri ulash kodini oling.");
    }
    return NextResponse.json({ ok: true });
  }

  const { data: settings } = await admin
    .from("ai_telegram_settings")
    .select("chat_id")
    .order("linked_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!settings || settings.chat_id !== chatId) {
    await sendTelegramMessage(chatId, "Ruxsat yo'q. Administrator sizga ulash kodini berishi kerak (/start <kod>).");
    return NextResponse.json({ ok: true });
  }

  // Deliberately not awaited — Telegram expects a fast ack, and a real
  // orchestrator turn (delegation + specialist tool loops) can take
  // minutes, exactly like the web chat's background pattern.
  void runTelegramTurnInBackground(admin, chatId, text);

  return NextResponse.json({ ok: true });
}

async function runTelegramTurnInBackground(
  admin: Awaited<ReturnType<typeof createAdminClient>>,
  chatId: number,
  userText: string,
): Promise<void> {
  try {
    let { data: conversation } = await admin
      .from("ai_conversations")
      .select("*")
      .eq("channel", "telegram")
      .maybeSingle();

    if (!conversation) {
      const { data: created, error } = await admin
        .from("ai_conversations")
        .insert({ messages: [], channel: "telegram", title: "Telegram" })
        .select("*")
        .single();
      if (error) throw error;
      conversation = created;
    }

    const messages = (conversation.messages as unknown as Anthropic.MessageParam[]) ?? [];
    repairDanglingToolUse(messages);
    messages.push({ role: "user", content: userText });
    await admin.from("ai_conversations").update({ messages: messages as unknown as never, processing: true }).eq("id", conversation.id);

    await sendTelegramMessage(chatId, "⏳ Ishlanmoqda...");

    const result = await runOrchestrator(messages);

    await admin
      .from("ai_conversations")
      .update({ messages: messages as unknown as never, processing: false, live_specialist_runs: [] as unknown as never })
      .eq("id", conversation.id);

    await sendTelegramMessage(chatId, result.finalText);
  } catch (err) {
    console.error("[telegram] turn failed:", err);
    await sendTelegramMessage(
      chatId,
      `Xatolik: ${err instanceof Error ? err.message : "noma'lum xatolik"}. Qayta urinib ko'ring.`,
    );
  }
}
