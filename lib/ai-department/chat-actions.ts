"use server";

import type Anthropic from "@anthropic-ai/sdk";
import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/lms/admin-actions";
import { createAdminClient } from "@/lib/supabase/server";
import { runOrchestrator, type SpecialistRun } from "@/lib/ai-department/orchestrator";

export type ChatMessage = { role: "user" | "assistant"; content: Anthropic.MessageParam["content"] };

/**
 * A turn that got interrupted (crash, timeout, redeploy) mid-delegation
 * leaves the transcript ending on an assistant message with `tool_use`
 * blocks that were never answered. The Anthropic API requires every
 * `tool_use` to be immediately followed by a matching `tool_result` — so
 * before appending a new user turn onto a conversation like that, close
 * out the dangling calls with a synthetic "interrupted" result. Without
 * this, every future message in that conversation fails and the thread is
 * permanently stuck.
 */
function repairDanglingToolUse(messages: Anthropic.MessageParam[]): void {
  const last = messages[messages.length - 1];
  if (!last || last.role !== "assistant" || !Array.isArray(last.content)) return;
  const toolUses = last.content.filter(
    (block): block is Anthropic.ToolUseBlock => block.type === "tool_use",
  );
  if (toolUses.length === 0) return;
  messages.push({
    role: "user",
    content: toolUses.map((toolUse) => ({
      type: "tool_result" as const,
      tool_use_id: toolUse.id,
      content: "Bu topshiriq oldingi seansda uzilib qolgan (server qayta ishga tushdi yoki vaqt tugadi). Bekor qilindi.",
      is_error: true,
    })),
  });
}

export async function createConversation(): Promise<string> {
  await requireAdmin();
  const admin = await createAdminClient();
  const { data, error } = await admin
    .from("ai_conversations")
    .insert({ messages: [] })
    .select("id")
    .single();
  if (error) throw error;
  revalidatePath("/admin/ai-department");
  return data.id;
}

export async function listConversations() {
  await requireAdmin();
  const admin = await createAdminClient();
  const { data } = await admin
    .from("ai_conversations")
    .select("id, title, updated_at")
    .order("updated_at", { ascending: false })
    .limit(30);
  return data ?? [];
}

export async function getConversation(id: string) {
  await requireAdmin();
  const admin = await createAdminClient();
  const { data } = await admin.from("ai_conversations").select("*").eq("id", id).maybeSingle();
  return data;
}

/**
 * A real turn — the orchestrator delegating to several specialists, each
 * doing its own multi-step research/writing — can take minutes. Running
 * that inside one synchronous request means the browser (or an
 * intermediate proxy) gives up long before it's done, which is exactly
 * what was happening: the client was seeing "An unexpected response was
 * received from the server" after the connection was closed out from
 * under it, even though the server kept working. So `sendChatMessage`
 * only does the fast part synchronously (persist the user's message,
 * mark the conversation as processing) and returns immediately; the
 * actual orchestration runs in the background on this same long-running
 * server process (not a serverless function — the process survives past
 * the request), persisting its own progress via the hooks below. The
 * chat UI polls `getConversation` and renders `live_specialist_runs` /
 * `processing` until the turn finishes.
 */
export async function sendChatMessage(conversationId: string, userText: string): Promise<void> {
  await requireAdmin();
  const admin = await createAdminClient();

  const { data: conversation } = await admin
    .from("ai_conversations")
    .select("*")
    .eq("id", conversationId)
    .maybeSingle();
  if (!conversation) throw new Error("conversation_not_found");

  const messages = (conversation.messages as unknown as Anthropic.MessageParam[]) ?? [];
  repairDanglingToolUse(messages);
  messages.push({ role: "user", content: userText });

  const title = conversation.title ?? userText.slice(0, 60);

  await admin
    .from("ai_conversations")
    .update({ messages: messages as unknown as never, title, processing: true })
    .eq("id", conversationId);

  revalidatePath("/admin/ai-department");

  // Deliberately not awaited — see the doc comment above.
  void runTurnInBackground(admin, conversationId, messages, title);
}

async function runTurnInBackground(
  admin: Awaited<ReturnType<typeof createAdminClient>>,
  conversationId: string,
  messages: Anthropic.MessageParam[],
  title: string,
): Promise<void> {
  const liveRuns: SpecialistRun[] = [];
  try {
    await runOrchestrator(messages, {
      onDelegationStarted: async (msgs) => {
        // Persist the delegation itself immediately — if everything after
        // this crashes, the conversation still shows a (repairable) record
        // that this turn was attempted, instead of vanishing entirely.
        await admin
          .from("ai_conversations")
          .update({ messages: msgs as unknown as never, title, live_specialist_runs: [] as unknown as never })
          .eq("id", conversationId);
      },
      onSpecialistDone: async (run) => {
        liveRuns.push(run);
        await admin
          .from("ai_conversations")
          .update({ live_specialist_runs: liveRuns as unknown as never })
          .eq("id", conversationId);
      },
    });

    await admin
      .from("ai_conversations")
      .update({
        messages: messages as unknown as never,
        title,
        live_specialist_runs: [] as unknown as never,
        processing: false,
      })
      .eq("id", conversationId);
  } catch (err) {
    messages.push({
      role: "assistant",
      content: [
        {
          type: "text",
          text: `Xatolik: ${err instanceof Error ? err.message : "noma'lum xatolik"}. Iltimos, qayta urinib ko'ring.`,
        },
      ],
    });
    await admin
      .from("ai_conversations")
      .update({
        messages: messages as unknown as never,
        title,
        live_specialist_runs: [] as unknown as never,
        processing: false,
      })
      .eq("id", conversationId);
  }
}
