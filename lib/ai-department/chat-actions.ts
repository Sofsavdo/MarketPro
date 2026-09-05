"use server";

import type Anthropic from "@anthropic-ai/sdk";
import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/lms/admin-actions";
import { createAdminClient } from "@/lib/supabase/server";
import { runOrchestrator } from "@/lib/ai-department/orchestrator";
import { getAgentRoster } from "@/lib/ai-department/agents";

export type ChatMessage = { role: "user" | "assistant"; content: Anthropic.MessageParam["content"] };

export type SpecialistReply = { agentName: string; text: string; actions: string[] };
export type ChatReply = { orchestratorText: string; specialistReplies: SpecialistReply[] };

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
  messages.push({ role: "user", content: userText });

  const { finalText, specialistRuns } = await runOrchestrator(messages);

  const title = conversation.title ?? userText.slice(0, 60);
  await admin
    .from("ai_conversations")
    .update({ messages: messages as unknown as never, title })
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
