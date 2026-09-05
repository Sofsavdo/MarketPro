"use server";

import type Anthropic from "@anthropic-ai/sdk";
import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/lms/admin-actions";
import { createAdminClient } from "@/lib/supabase/server";
import { runOrchestrator, type SpecialistRun } from "@/lib/ai-department/orchestrator";
import { getAgentRoster } from "@/lib/ai-department/agents";

export type ChatMessage = { role: "user" | "assistant"; content: Anthropic.MessageParam["content"] };

export type SpecialistReply = { agentName: string; text: string; actions: string[] };
export type ChatReply = { orchestratorText: string; specialistReplies: SpecialistReply[] };

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
 * Sends one user turn to the CEO/Orchestrator agent, which delegates to
 * whichever specialists the request needs (see lib/ai-department/
 * orchestrator.ts), persists the full orchestrator-level transcript, and
 * returns EVERY specialist's own reply (its text plus a concrete action
 * log of what it actually saved) alongside the orchestrator's synthesis —
 * the chat UI renders each specialist's reply as its own message, not
 * just an anonymous "AI did something" summary.
 */
export async function sendChatMessage(conversationId: string, userText: string): Promise<ChatReply> {
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
  const liveRuns: SpecialistRun[] = [];

  const { finalText, specialistRuns } = await runOrchestrator(messages, {
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
    .update({ messages: messages as unknown as never, title, live_specialist_runs: [] as unknown as never })
    .eq("id", conversationId);

  const roster = await getAgentRoster();
  const byKey = new Map(roster.map((a) => [a.key, a.name]));

  const specialistReplies: SpecialistReply[] = specialistRuns.map((run) => ({
    agentName: byKey.get(run.agentKey) ?? run.agentKey,
    text: run.text,
    actions: run.actions,
  }));

  revalidatePath("/admin/ai-department");
  return { orchestratorText: finalText, specialistReplies };
}
