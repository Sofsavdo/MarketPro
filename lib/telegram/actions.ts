"use server";

import { requireAdmin } from "@/lib/lms/admin-actions";
import { createAdminClient } from "@/lib/supabase/server";
import { setTelegramWebhook, getTelegramWebhookInfo } from "@/lib/telegram/client";

export async function getTelegramStatus() {
  await requireAdmin();
  const admin = await createAdminClient();
  const { data: settings } = await admin
    .from("ai_telegram_settings")
    .select("chat_id, linked_at")
    .order("linked_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  return {
    configured: Boolean(process.env.TELEGRAM_BOT_TOKEN),
    setupCode: process.env.TELEGRAM_SETUP_CODE ?? null,
    linkedChatId: settings?.chat_id ?? null,
    linkedAt: settings?.linked_at ?? null,
  };
}

/** One-time setup: registers this deployment's webhook URL with Telegram. Run from an authenticated admin action (a plain server-side fetch call to api.telegram.org) since Telegram itself never calls anything until this is set. */
export async function connectTelegramWebhook(): Promise<{ ok: boolean; description?: string }> {
  await requireAdmin();
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://izdosh.uz";
  const secret = process.env.TELEGRAM_WEBHOOK_SECRET;
  if (!secret) return { ok: false, description: "TELEGRAM_WEBHOOK_SECRET sozlanmagan" };
  return setTelegramWebhook(`${siteUrl}/api/telegram/webhook`, secret);
}

export async function getTelegramWebhookStatus() {
  await requireAdmin();
  return getTelegramWebhookInfo();
}
