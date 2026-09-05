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

export type SpecialistRun = {
  agentKey: string;
  taskInstruction: string;
  text: string;
  actions: string[];
};

export type OrchestratorHooks = {
  /** Fired once, right after the orchestrator decides what to delegate — before any specialist has run. Lets the caller persist the delegation itself so it isn't lost if everything after this point dies. */
  onDelegationStarted?: (messages: Anthropic.MessageParam[]) => Promise<void>;
  /** Fired once per specialist, as soon as that specialist finishes (success or failure) — independent of whether the rest of the turn ever completes. */
  onSpecialistDone?: (run: SpecialistRun) => Promise<void>;
};

/**
 * Runs one specialist's own tool-use loop to completion, in a fresh,
 * isolated conversation (it does not see the admin's chat history — only
 * the exact task the orchestrator hands it). Every tool call it makes is
 * tagged with its agent key so the admin UI can attribute the result, and
 * every tool result is also collected into `actions` — a concrete,
 * checkable log ("Saqlandi. id=...") distinct from the specialist's own
 * prose, so the admin can verify what actually got written to the
 * database instead of trusting the model's self-report.
 */
async function runSpecialistAgent(agentKey: string, taskInstruction: string): Promise<SpecialistRun> {
  const agent = await getAgent(agentKey);
  if (!agent) {
    return {
      agentKey,
      taskInstruction,
      text: `Xatolik: "${agentKey}" nomli mutaxassis topilmadi.`,
      actions: [],
    };
  }

  const anthropic = getClient();
  const system = await buildSpecialistSystemPrompt(agent, taskInstruction);
  const messages: Anthropic.MessageParam[] = [{ role: "user", content: taskInstruction }];
  const actions: string[] = [];

  let finalText = "";
  for (let i = 0; i < MAX_SPECIALIST_ITERATIONS; i++) {
    const response = await anthropic.messages.create({
      model: MODEL,
      max_tokens: 8192,
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
        // web_search never reaches here (Anthropic-hosted, resolved inline
        // in the response) — every tool_use that does is one of our own
        // persistence tools, so it's always worth logging as an action.
        const result = await executeAiDepartmentTool(toolUse, agentKey);
        actions.push(`${toolUse.name}: ${result.content}`);
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

  return {
    agentKey,
    taskInstruction,
    text: finalText || "(matn qaytarmadi, lekin quyidagi amallarni bajargan)",
    actions,
  };
}

export type OrchestratorResult = { finalText: string; specialistRuns: SpecialistRun[] };

/**
 * The CEO/Orchestrator agent: reads the admin's message (with full chat
 * history in `messages`), decides which specialist(s) the request needs,
 * and calls each via the delegate_to_agent tool — possibly several in
 * parallel, since Claude can emit multiple tool_use blocks in one turn.
 * Each delegated specialist runs its own isolated tool loop
 * (runSpecialistAgent); its full result (text + concrete action log) comes
 * back both to the orchestrator (as a compact tool_result, so it can
 * synthesize a reply) and out to the caller via `specialistRuns`, so the
 * chat UI can show every specialist's own message — not just the
 * orchestrator's summary of it.
 *
 * Mutates `messages` in place (appends the full orchestrator-level
 * transcript) so the caller can persist it for chat history.
 */
export async function runOrchestrator(
  messages: Anthropic.MessageParam[],
  hooks: OrchestratorHooks = {},
): Promise<OrchestratorResult> {
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

  const specialistRuns: SpecialistRun[] = [];
  let finalText = "";

  for (let i = 0; i < MAX_ORCHESTRATOR_ITERATIONS; i++) {
    const response = await anthropic.messages.create({
      model: MODEL,
      max_tokens: 8192,
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

    // Persist the delegation itself before running any specialist, so a
    // crash or timeout during the (potentially long) fan-out below doesn't
    // lose the fact that this turn was ever attempted.
    await hooks.onDelegationStarted?.(messages);

    const toolResults = await Promise.all(
      toolUses.map(async (toolUse) => {
        const input = toolUse.input as { agent_key?: string; task_instruction?: string };
        let run: SpecialistRun;
        if (!input.agent_key || !input.task_instruction) {
          // Seen in production: a truncated tool_use block (the model's
          // response got cut off mid-JSON) missing a required field.
          // Fail this one delegation cleanly instead of crashing the turn.
          run = {
            agentKey: input.agent_key ?? "noma'lum",
            taskInstruction: input.task_instruction ?? "",
            text: "Xatolik: bu topshiriq to'liq shakllanmadi (vazifa matni yetib kelmadi). Iltimos, so'rovni qayta yuboring.",
            actions: [],
          };
        } else {
          run = await runSpecialistAgent(input.agent_key, input.task_instruction);
        }
        specialistRuns.push(run);
        await hooks.onSpecialistDone?.(run);
        // The orchestrator only needs a compact summary to synthesize its
        // own reply — the full text/actions go to the caller separately.
        const summary =
          run.actions.length > 0
            ? `${run.text}\n\nBajarilgan amallar: ${run.actions.length} ta.`
            : run.text;
        return {
          type: "tool_result" as const,
          tool_use_id: toolUse.id,
          content: summary,
        };
      }),
    );

    messages.push({ role: "user", content: toolResults });
  }

  return { finalText: finalText || "(javob bo'sh qaytdi)", specialistRuns };
}
