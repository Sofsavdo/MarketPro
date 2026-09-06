import Anthropic from "@anthropic-ai/sdk";
import { GoogleGenAI, type Content, type Part, type Tool as GeminiTool } from "@google/genai";

/**
 * Emergency fallback for when the Anthropic API is unavailable (out of
 * credit, overloaded, rate-limited) — routes the same call through Gemini
 * instead, translating just enough of the request/response shape that the
 * orchestrator/specialist loops in orchestrator.ts don't need to know which
 * provider actually answered. Only engages when GEMINI_API_KEY is set; with
 * it unset, any Anthropic failure surfaces exactly as it did before this
 * existed.
 *
 * This is deliberately not a full multi-provider abstraction — it converts
 * only what AI_DEPARTMENT_TOOLS and the orchestrator's own delegate_to_agent
 * tool actually use (JSON-Schema function tools, Anthropic's hosted
 * web_search, plain text/tool_use/tool_result turns). Thinking blocks are
 * dropped on the way in (Gemini has no equivalent) and never produced on the
 * way out.
 */

export type ModelResponse = {
  content: Anthropic.ContentBlock[];
  stop_reason: Anthropic.Message["stop_reason"];
};

export type CreateMessageParams = {
  model: string;
  max_tokens: number;
  system: string;
  messages: Anthropic.MessageParam[];
  tools: Anthropic.ToolUnion[];
  thinking?: Anthropic.ThinkingConfigParam;
  output_config?: Anthropic.MessageCreateParams["output_config"];
};

function shouldFallbackToGemini(err: unknown): boolean {
  if (err instanceof Anthropic.APIError) {
    // "credit balance too low" is a 400 invalid_request_error — the one
    // case this fallback exists for in the first place.
    if (err.status === 400 && /credit balance/i.test(err.message)) return true;
    if (err.status === 429) return true;
    if (err.status === 529) return true;
    if (typeof err.status === "number" && err.status >= 500) return true;
    return false;
  }
  // Network-level failures (fetch throwing, DNS, timeout) never reach the
  // API at all, so there's no status to check — worth failing over too.
  return true;
}

let genAI: GoogleGenAI | null = null;
function getGenAI(): GoogleGenAI {
  if (!genAI) genAI = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  return genAI;
}

function toGeminiTools(tools: Anthropic.ToolUnion[]): GeminiTool[] {
  const functionDeclarations: { name: string; description?: string; parametersJsonSchema?: unknown }[] = [];
  let hasWebSearch = false;

  for (const tool of tools) {
    if ("type" in tool && typeof tool.type === "string" && tool.type.startsWith("web_search")) {
      hasWebSearch = true;
      continue;
    }
    const t = tool as Anthropic.Tool;
    functionDeclarations.push({
      name: t.name,
      description: t.description,
      parametersJsonSchema: t.input_schema,
    });
  }

  const geminiTools: GeminiTool[] = [];
  if (functionDeclarations.length > 0) geminiTools.push({ functionDeclarations });
  // Gemini's built-in Google Search grounding tool is the closest match for
  // Anthropic's hosted web_search — same "let the model look things up"
  // intent, different vendor underneath.
  if (hasWebSearch) geminiTools.push({ googleSearch: {} });
  return geminiTools;
}

/** Anthropic's tool_result blocks reference tool_use_id, not the tool's
 * name — Gemini's functionResponse needs the name instead, so this scans
 * every prior tool_use block in the conversation to resolve one to the
 * other before converting message history. */
function buildToolNameById(messages: Anthropic.MessageParam[]): Map<string, string> {
  const byId = new Map<string, string>();
  for (const message of messages) {
    if (!Array.isArray(message.content)) continue;
    for (const block of message.content) {
      if (block.type === "tool_use") byId.set(block.id, block.name);
    }
  }
  return byId;
}

function toGeminiContents(messages: Anthropic.MessageParam[]): Content[] {
  const toolNameById = buildToolNameById(messages);
  const contents: Content[] = [];

  for (const message of messages) {
    const role = message.role === "assistant" ? "model" : "user";

    if (typeof message.content === "string") {
      contents.push({ role, parts: [{ text: message.content }] });
      continue;
    }

    const parts: Part[] = [];
    for (const block of message.content) {
      if (block.type === "text") {
        parts.push({ text: block.text });
      } else if (block.type === "tool_use") {
        parts.push({ functionCall: { name: block.name, args: block.input as Record<string, unknown> } });
      } else if (block.type === "tool_result") {
        const name = toolNameById.get(block.tool_use_id) ?? "unknown_function";
        const resultText =
          typeof block.content === "string"
            ? block.content
            : (block.content ?? [])
                .map((c) => (c.type === "text" ? c.text : ""))
                .join("\n");
        parts.push({
          functionResponse: {
            name,
            response: block.is_error ? { error: resultText } : { output: resultText },
          },
        });
      }
      // thinking/redacted_thinking blocks: Gemini has no equivalent, dropped.
    }
    if (parts.length > 0) contents.push({ role, parts });
  }

  return contents;
}

function fromGeminiResponse(response: {
  candidates?: { content?: Content }[];
}): ModelResponse {
  const parts = response.candidates?.[0]?.content?.parts ?? [];
  const content: Anthropic.ContentBlock[] = [];
  let toolCallCount = 0;

  for (const part of parts) {
    if (part.text) {
      content.push({ type: "text", text: part.text, citations: null } as Anthropic.TextBlock);
    } else if (part.functionCall) {
      toolCallCount++;
      content.push({
        type: "tool_use",
        id: `gemini_${part.functionCall.name ?? "call"}_${Date.now()}_${toolCallCount}`,
        name: part.functionCall.name ?? "",
        input: part.functionCall.args ?? {},
      } as Anthropic.ToolUseBlock);
    }
  }

  return {
    content,
    stop_reason: toolCallCount > 0 ? "tool_use" : "end_turn",
  };
}

async function callGemini(params: CreateMessageParams): Promise<ModelResponse> {
  const ai = getGenAI();
  const model = process.env.GEMINI_MODEL || "gemini-2.5-flash";
  const tools = toGeminiTools(params.tools);

  const response = await ai.models.generateContent({
    model,
    contents: toGeminiContents(params.messages),
    config: {
      systemInstruction: params.system,
      tools: tools.length > 0 ? tools : undefined,
      maxOutputTokens: params.max_tokens,
    },
  });

  return fromGeminiResponse(response);
}

/**
 * Drop-in replacement for `anthropic.messages.create(...)` in
 * orchestrator.ts — tries Anthropic first and only reaches for Gemini on a
 * failure worth failing over (see shouldFallbackToGemini). Returns just the
 * two fields callers actually read (`content`, `stop_reason`), so the
 * calling loop doesn't need to know which provider answered.
 */
export async function createMessageWithFallback(
  anthropic: Anthropic,
  params: CreateMessageParams,
): Promise<ModelResponse> {
  try {
    const response = await anthropic.messages.create({
      model: params.model,
      max_tokens: params.max_tokens,
      system: params.system,
      messages: params.messages,
      tools: params.tools,
      thinking: params.thinking,
      output_config: params.output_config,
    } as Anthropic.MessageCreateParamsNonStreaming);
    return { content: response.content, stop_reason: response.stop_reason };
  } catch (err) {
    if (!process.env.GEMINI_API_KEY || !shouldFallbackToGemini(err)) throw err;
    console.error(
      "[ai-department] Anthropic call failed, falling back to Gemini:",
      err instanceof Error ? err.message : err,
    );
    return callGemini(params);
  }
}
