"use server";

import Anthropic from "@anthropic-ai/sdk";
import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/lms/admin-actions";
import { createAdminClient } from "@/lib/supabase/server";
import { buildSystemPrompt } from "@/lib/ai-department/system-prompt";
import { AI_DEPARTMENT_TOOLS, executeAiDepartmentTool } from "@/lib/ai-department/tools";

const MODEL = "claude-opus-5";
const MAX_TOOL_ITERATIONS = 6;

let client: Anthropic | null = null;
function getClient() {
  if (!client) client = new Anthropic();
  return client;
}

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
 * Sends one user turn, runs the tool-use loop to completion (executing
 * save_content_idea/create_task/save_competitor_note ourselves; web_search
 * is Anthropic-hosted and needs no handling here), persists the full
 * message history, and returns only the assistant's final text — the tool
 * round-trips are an implementation detail the chat UI doesn't need to see.
 */
export async function sendChatMessage(conversationId: string, userText: string): Promise<string> {
  await requireAdmin();
  const admin = await createAdminClient();
  const anthropic = getClient();

  const { data: conversation } = await admin
    .from("ai_conversations")
    .select("*")
    .eq("id", conversationId)
    .maybeSingle();
  if (!conversation) throw new Error("conversation_not_found");

  const messages = (conversation.messages as unknown as Anthropic.MessageParam[]) ?? [];
  messages.push({ role: "user", content: userText });

  const system = await buildSystemPrompt();

  let finalText = "";
  for (let i = 0; i < MAX_TOOL_ITERATIONS; i++) {
    const response = await anthropic.messages.create({
      model: MODEL,
      max_tokens: 4096,
      system,
      messages,
      tools: AI_DEPARTMENT_TOOLS,
      thinking: { type: "adaptive" },
      output_config: { effort: "medium" },
    });

    messages.push({ role: "assistant", content: response.content });

    const toolUses = response.content.filter(
      (block): block is Anthropic.ToolUseBlock => block.type === "tool_use",
    );

    finalText = response.content
      .filter((block): block is Anthropic.TextBlock => block.type === "text")
      .map((block) => block.text)
      .join("\n");

    if (response.stop_reason !== "tool_use" || toolUses.length === 0) break;

    const toolResults = await Promise.all(
      toolUses.map(async (toolUse) => {
        // web_search is handled entirely server-side by Anthropic — it
        // never reaches here as a tool_use block needing our execution.
        const result = await executeAiDepartmentTool(toolUse);
        return {
          type: "tool_result" as const,
          tool_use_id: result.tool_use_id,
          content: result.content,
          is_error: result.is_error,
        };
      }),
    );

    messages.push({ role: "user", content: toolResults });
  }

  const title = conversation.title ?? userText.slice(0, 60);
  await admin
    .from("ai_conversations")
    .update({ messages: messages as unknown as never, title })
    .eq("id", conversationId);

  revalidatePath("/admin/ai-department");
  return finalText || "(javob bo'sh qaytdi — qayta urinib ko'ring)";
}
