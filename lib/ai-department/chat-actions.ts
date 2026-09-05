"use server";

import type Anthropic from "@anthropic-ai/sdk";
import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/lms/admin-actions";
import { createAdminClient } from "@/lib/supabase/server";
import { runOrchestrator } from "@/lib/ai-department/orchestrator";
import { getAgentRoster } from "@/lib/ai-department/agents";

export type ChatMessage = { role: "user" | "assistant"; content: Anthropic.MessageParam["content"] };

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
 * returns the synthesized reply plus which specialists were involved —
 * the admin chat UI shows both, so this never reads as one anonymous bot.
 */
export async function sendChatMessage(
  conversationId: string,
  userText: string,
): Promise<{ text: string; agentNames: string[] }> {
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

  const { finalText, delegatedAgents } = await runOrchestrator(messages);

  const title = conversation.title ?? userText.slice(0, 60);
  await admin
    .from("ai_conversations")
    .update({ messages: messages as unknown as never, title })
    .eq("id", conversationId);

  let agentNames: string[] = [];
  if (delegatedAgents.length > 0) {
    const roster = await getAgentRoster();
    const byKey = new Map(roster.map((a) => [a.key, a.name]));
    agentNames = delegatedAgents.map((key) => byKey.get(key) ?? key);
  }

  revalidatePath("/admin/ai-department");
  return { text: finalText, agentNames };
}
