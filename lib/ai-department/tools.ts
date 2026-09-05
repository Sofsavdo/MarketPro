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
      "Kontent g'oyasini (Reels/post/story) bazaga saqlaydi, keyin admin panelda ko'rinadi va tasdiqlanishi mumkin. Har doim score_* maydonlarini ham to'ldir — bu spec'ning content score tizimi (VALUE/HOOK/RETENTION/SHAREABILITY/SAVEABILITY/BRAND_FIT/ORIGINALITY/CONVERSION, har biri 1-10).",
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
        score_value: { type: "integer", minimum: 1, maximum: 10 },
        score_hook: { type: "integer", minimum: 1, maximum: 10 },
        score_retention: { type: "integer", minimum: 1, maximum: 10 },
        score_shareability: { type: "integer", minimum: 1, maximum: 10 },
        score_saveability: { type: "integer", minimum: 1, maximum: 10 },
        score_brand_fit: { type: "integer", minimum: 1, maximum: 10 },
        score_originality: { type: "integer", minimum: 1, maximum: 10 },
        score_conversion: { type: "integer", minimum: 1, maximum: 10 },
      },
      required: ["brand", "title"],
      additionalProperties: false,
    },
  },
  {
    name: "save_script",
    description:
      "Mavjud kontent g'oyasi uchun to'liq Reels/post skripti (va caption/CTA) saqlaydi. Avval save_content_idea bilan g'oya yaratilgan bo'lishi kerak, uning id'sini content_idea_id sifatida ber.",
    input_schema: {
      type: "object",
      properties: {
        content_idea_id: { type: "string" },
        script: { type: "string", description: "To'liq skript matni (sahna-sahna yoki gap-gap)" },
        caption: { type: "string" },
        cta: { type: "string" },
      },
      required: ["content_idea_id", "script"],
      additionalProperties: false,
    },
  },
  {
    name: "save_objection_response",
    description:
      "Yangi mijoz e'tirozi va unga javobni objection library'ga saqlaydi (agar shu e'tiroz uchun allaqachon yozuv bo'lsa, uni yangilaydi).",
    input_schema: {
      type: "object",
      properties: {
        objection_text: { type: "string" },
        empathetic_response: { type: "string" },
        clarification: { type: "string" },
        value_explanation: { type: "string" },
        suggested_offer: { type: "string" },
      },
      required: ["objection_text", "empathetic_response"],
      additionalProperties: false,
    },
  },
  {
    name: "generate_report",
    description:
      "Haftalik yoki oylik hisobotni bazaga saqlaydi (spec §48-49) — admin /admin/ai-department/reports sahifasida ko'radi. Hisobot matnini shu tool orqali strukturaviy saqla, faqat chatda aytib qo'yma.",
    input_schema: {
      type: "object",
      properties: {
        period: { type: "string", enum: ["weekly", "monthly"] },
        period_start: { type: "string", description: "YYYY-MM-DD" },
        period_end: { type: "string", description: "YYYY-MM-DD" },
        summary: { type: "string", description: "Executive summary" },
        stop: { type: "string", description: "Keyingi davrda to'xtatish kerak bo'lgan narsalar" },
        start: { type: "string", description: "Keyingi davrda boshlash kerak bo'lgan narsalar" },
        continue_doing: { type: "string", description: "Davom ettirish kerak bo'lgan narsalar" },
      },
      required: ["period", "period_start", "period_end", "summary"],
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
            score_value: (input.score_value as number) ?? null,
            score_hook: (input.score_hook as number) ?? null,
            score_retention: (input.score_retention as number) ?? null,
            score_shareability: (input.score_shareability as number) ?? null,
            score_saveability: (input.score_saveability as number) ?? null,
            score_brand_fit: (input.score_brand_fit as number) ?? null,
            score_originality: (input.score_originality as number) ?? null,
            score_conversion: (input.score_conversion as number) ?? null,
          })
          .select("id")
          .single();
        if (error) throw error;
        return { tool_use_id: toolUse.id, content: `Saqlandi. id=${data.id}` };
      }

      case "save_script": {
        const { error } = await admin.from("ai_scripts").insert({
          content_idea_id: input.content_idea_id as string,
          script: input.script as string,
          caption: (input.caption as string) ?? null,
          cta: (input.cta as string) ?? null,
        });
        if (error) throw error;
        return { tool_use_id: toolUse.id, content: "Skript saqlandi." };
      }

      case "save_objection_response": {
        const { error } = await admin.from("ai_objections").upsert(
          {
            objection_text: input.objection_text as string,
            empathetic_response: input.empathetic_response as string,
            clarification: (input.clarification as string) ?? null,
            value_explanation: (input.value_explanation as string) ?? null,
            suggested_offer: (input.suggested_offer as string) ?? null,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "objection_text" },
        );
        if (error) throw error;
        return { tool_use_id: toolUse.id, content: "E'tiroz javobi saqlandi." };
      }

      case "generate_report": {
        const { error } = await admin.from("ai_reports").insert({
          period: input.period as "weekly" | "monthly",
          period_start: input.period_start as string,
          period_end: input.period_end as string,
          content: {
            summary: input.summary as string,
            stop: (input.stop as string) ?? null,
            start: (input.start as string) ?? null,
            continue_doing: (input.continue_doing as string) ?? null,
          },
        });
        if (error) throw error;
        return { tool_use_id: toolUse.id, content: "Hisobot saqlandi." };
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
