import type Anthropic from "@anthropic-ai/sdk";
import { createAdminClient } from "@/lib/supabase/server";

/**
 * Custom tools the AI Marketing Department can call to persist its work —
 * without these, ideas/tasks/notes would only ever exist as chat text and
 * disappear once the conversation scrolls. web_search is Anthropic's own
 * server-side tool (no execution code needed here) for current-info
 * research (spec's fact-checking + competitor/trend research requirement).
 */
export const AI_DEPARTMENT_TOOLS: Anthropic.ToolUnion[] = [
  {
    type: "web_search_20260209",
    name: "web_search",
    max_uses: 5,
  },
  {
    name: "save_content_idea",
    description:
      "Kontent g'oyasini (Reels/post/story) bazaga saqlaydi, keyin admin panelda ko'rinadi va tasdiqlanishi mumkin.",
    input_schema: {
      type: "object",
      properties: {
        brand: { type: "string", enum: ["amaliy_biznes", "izdosh_academy"] },
        title: { type: "string", description: "Qisqa nom/hook" },
        pillar: { type: "string", description: "Content pillar nomi" },
        format: { type: "string", description: "Masalan: Talking head, Case study, Carousel" },
        hook: { type: "string" },
        body: { type: "string", description: "G'oyaning to'liq tavsifi/skript qoralamasi" },
        scheduled_for: { type: "string", description: "YYYY-MM-DD, ixtiyoriy" },
      },
      required: ["brand", "title"],
      additionalProperties: false,
    },
  },
  {
    name: "create_task",
    description: "Admin uchun task yaratadi (task manager'da ko'rinadi).",
    input_schema: {
      type: "object",
      properties: {
        title: { type: "string" },
        description: { type: "string" },
        brand: { type: "string", enum: ["amaliy_biznes", "izdosh_academy"] },
        priority: { type: "string", enum: ["low", "normal", "high"] },
        deadline: { type: "string", description: "YYYY-MM-DD, ixtiyoriy" },
      },
      required: ["title"],
      additionalProperties: false,
    },
  },
  {
    name: "save_competitor_note",
    description:
      "Raqobatchi haqidagi tahlil/kuzatuvni saqlaydi. Agar raqobatchi hali mavjud bo'lmasa, avval uni yaratadi.",
    input_schema: {
      type: "object",
      properties: {
        competitor_name: { type: "string" },
        competitor_category: {
          type: "string",
          description: "Masalan: Marketplace education, Business creator, Education creator",
        },
        summary: { type: "string" },
        source_url: { type: "string" },
      },
      required: ["competitor_name", "summary"],
      additionalProperties: false,
    },
  },
];

type ToolResult = { tool_use_id: string; content: string; is_error?: boolean };

export async function executeAiDepartmentTool(
  toolUse: Anthropic.ToolUseBlock,
): Promise<ToolResult> {
  const admin = await createAdminClient();
  const input = toolUse.input as Record<string, unknown>;

  try {
    switch (toolUse.name) {
      case "save_content_idea": {
        const { data, error } = await admin
          .from("ai_content_ideas")
          .insert({
            brand: input.brand as "amaliy_biznes" | "izdosh_academy",
            title: input.title as string,
            pillar: (input.pillar as string) ?? null,
            format: (input.format as string) ?? null,
            hook: (input.hook as string) ?? null,
            body: (input.body as string) ?? null,
            scheduled_for: (input.scheduled_for as string) ?? null,
          })
          .select("id")
          .single();
        if (error) throw error;
        return { tool_use_id: toolUse.id, content: `Saqlandi. id=${data.id}` };
      }

      case "create_task": {
        const { data, error } = await admin
          .from("ai_tasks")
          .insert({
            title: input.title as string,
            description: (input.description as string) ?? null,
            brand: (input.brand as "amaliy_biznes" | "izdosh_academy") ?? null,
            priority: (input.priority as "low" | "normal" | "high") ?? "normal",
            deadline: (input.deadline as string) ?? null,
          })
          .select("id")
          .single();
        if (error) throw error;
        return { tool_use_id: toolUse.id, content: `Task yaratildi. id=${data.id}` };
      }

      case "save_competitor_note": {
        const name = input.competitor_name as string;
        let { data: competitor } = await admin
          .from("ai_competitors")
          .select("id")
          .eq("name", name)
          .maybeSingle();

        if (!competitor) {
          const { data: created, error: createError } = await admin
            .from("ai_competitors")
            .insert({
              name,
              category: (input.competitor_category as string) ?? "Boshqa",
            })
            .select("id")
            .single();
          if (createError) throw createError;
          competitor = created;
        }

        const { error } = await admin.from("ai_competitor_notes").insert({
          competitor_id: competitor.id,
          summary: input.summary as string,
          source_url: (input.source_url as string) ?? null,
        });
        if (error) throw error;
        return { tool_use_id: toolUse.id, content: "Raqobatchi tahlili saqlandi." };
      }

      default:
        return {
          tool_use_id: toolUse.id,
          content: `Noma'lum tool: ${toolUse.name}`,
          is_error: true,
        };
    }
  } catch (err) {
    return {
      tool_use_id: toolUse.id,
      content: err instanceof Error ? err.message : "Xatolik yuz berdi",
      is_error: true,
    };
  }
}
