import type Anthropic from "@anthropic-ai/sdk";

/**
 * A turn that got interrupted (crash, timeout, redeploy) mid-delegation
 * leaves the transcript ending on an assistant message with `tool_use`
 * blocks that were never answered. The Anthropic API requires every
 * `tool_use` to be immediately followed by a matching `tool_result` — so
 * before appending a new user turn onto a conversation like that, close
 * out the dangling calls with a synthetic "interrupted" result. Without
 * this, every future message in that conversation fails and the thread is
 * permanently stuck. Shared by both the web chat actions and the Telegram
 * webhook — every entry point that appends a fresh turn onto a persisted
 * conversation needs this same repair.
 */
export function repairDanglingToolUse(messages: Anthropic.MessageParam[]): void {
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
