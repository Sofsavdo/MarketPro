import Anthropic from "@anthropic-ai/sdk";
import { AI_DEPARTMENT_TOOLS, executeAiDepartmentTool } from "@/lib/ai-department/tools";
import {
  buildOrchestratorSystemPrompt,
  buildSpecialistSystemPrompt,
  getAgent,
  getAgentRoster,
} from "@/lib/ai-department/agents";

const MODEL = "claude-opus-5";
const MAX_ORCHESTRATOR_ITERATIONS = 4;
const MAX_SPECIALIST_ITERATIONS = 6;

let client: Anthropic | null = null;
function getClient() {
  if (!client) client = new Anthropic();
  return client;
}

/**
 * Runs one specialist's own tool-use loop to completion, in a fresh,
 * isolated conversation (it does not see the admin's chat history — only
 * the exact task the orchestrator hands it). Every tool call it makes is
 * tagged with its agent key so the admin UI can attribute the result.
 */
async function runSpecialistAgent(agentKey: string, taskInstruction: string): Promise<string> {
  const agent = await getAgent(agentKey);
  if (!agent) return `Xatolik: "${agentKey}" nomli mutaxassis topilmadi.`;

  const anthropic = getClient();
  const system = await buildSpecialistSystemPrompt(agent, taskInstruction);
  const messages: Anthropic.MessageParam[] = [{ role: "user", content: taskInstruction }];

  let finalText = "";
  for (let i = 0; i < MAX_SPECIALIST_ITERATIONS; i++) {
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
        const result = await executeAiDepartmentTool(toolUse, agentKey);
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

  return finalText || "(bu mutaxassis matn qaytarmadi, lekin tool orqali ish bajargan bo'lishi mumkin)";
}

export type OrchestratorResult = { finalText: string; delegatedAgents: string[] };

/**
 * The CEO/Orchestrator agent: reads the admin's message (with full chat
 * history in `messages`), decides which specialist(s) the request needs,
 * and calls each via the delegate_to_agent tool — possibly several in
 * parallel, since Claude can emit multiple tool_use blocks in one turn.
 * Each delegated specialist runs its own isolated tool loop
 * (runSpecialistAgent) and only its final text comes back to the
 * orchestrator, which then synthesizes one reply for the admin.
 *
 * Mutates `messages` in place (appends the full orchestrator-level
 * transcript) so the caller can persist it for chat history — the
 * specialists' own internal exchanges are not persisted, only referenced
 * through their final text as a tool_result.
 */
export async function runOrchestrator(messages: Anthropic.MessageParam[]): Promise<OrchestratorResult> {
  const anthropic = getClient();
  const [system, roster] = await Promise.all([buildOrchestratorSystemPrompt(), getAgentRoster()]);
  const specialistKeys = roster.filter((a) => a.key !== "orchestrator").map((a) => a.key);

  const delegateTool: Anthropic.Tool = {
    name: "delegate_to_agent",
    description:
      "Vazifani mos mutaxassisga topshiradi va uning yakuniy natijasini qaytaradi. Bir xabar davomida bir nechta mutaxassisga parallel (bir vaqtda, bir nechta chaqiruv bilan) topshiriq berish mumkin.",
    input_schema: {
      type: "object",
      properties: {
        agent_key: { type: "string", enum: specialistKeys },
        task_instruction: {
          type: "string",
          description:
            "Mutaxassisga beriladigan aniq, tor va to'liq vazifa. Mutaxassis suhbat tarixini ko'rmaydi — kerakli kontekstni (brend, mavzu, oldingi natija) shu yerda ber.",
        },
      },
      required: ["agent_key", "task_instruction"],
      additionalProperties: false,
    },
  };

  const delegatedAgents = new Set<string>();
  let finalText = "";

  for (let i = 0; i < MAX_ORCHESTRATOR_ITERATIONS; i++) {
    const response = await anthropic.messages.create({
      model: MODEL,
      max_tokens: 4096,
      system,
      messages,
      tools: [delegateTool],
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
        const input = toolUse.input as { agent_key: string; task_instruction: string };
        delegatedAgents.add(input.agent_key);
        const resultText = await runSpecialistAgent(input.agent_key, input.task_instruction);
        return {
          type: "tool_result" as const,
          tool_use_id: toolUse.id,
          content: resultText,
        };
      }),
    );

    messages.push({ role: "user", content: toolResults });
  }

  return { finalText: finalText || "(javob bo'sh qaytdi)", delegatedAgents: Array.from(delegatedAgents) };
}
