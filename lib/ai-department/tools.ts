import type Anthropic from "@anthropic-ai/sdk";
import { createAdminClient } from "@/lib/supabase/server";

/**
 * Custom tools every specialist agent can call to persist its work —
 * without these, ideas/tasks/notes would only ever exist as chat text and
 * disappear once the conversation scrolls. Every insert/update is tagged
 * with the calling agent's key (see executeAiDepartmentTool's agentKey
 * param) so the admin UI can show which specialist produced what.
 *
 * web_search is Anthropic's own server-side tool (no execution code
 * needed here) for current-info research. Deliberately the *basic*
 * 20250305 variant, not the newer 20260209 dynamic-filtering one: that
 * variant runs on an internal code-execution container and requires
 * echoing a container_id back on the next turn — our conversation
 * history round-trips through Postgres JSONB storage between turns,
 * which doesn't preserve that linkage, so the newer variant fails with
 * "container_id is required..." as soon as a second turn follows a
 * web_search call. The basic variant has no such requirement.
 */
export const AI_DEPARTMENT_TOOLS: Anthropic.ToolUnion[] = [
  {
    type: "web_search_20250305",
    name: "web_search",
    max_uses: 5,
  },
  {
    name: "save_content_idea",
    description:
      "Kontent g'oyasini (Reels/post/story) bazaga saqlaydi, keyin admin panelda ko'rinadi va tasdiqlanishi mumkin. Har doim score_* maydonlarini ham to'ldir — bu spec'ning content score tizimi (VALUE/HOOK/RETENTION/SHAREABILITY/SAVEABILITY/BRAND_FIT/ORIGINALITY/CONVERSION, har biri 1-10). Muvaffaqiyatli chaqiruv natijasidagi id'ni keyinchalik save_script/update_content_schedule uchun content_idea_id sifatida ishlat.",
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
      "Content g'oyasining ishlab chiqarish materialini saqlaydi/yangilaydi — script (ssenarist), caption/cta (copywriter) va direction_notes (rejissor) bir xil content_idea_id ostida to'planadi. Faqat o'zing to'ldirayotgan maydonlarni yubor — boshqa mutaxassis oldin to'ldirgan maydonlar o'chib ketmaydi.",
    input_schema: {
      type: "object",
      properties: {
        content_idea_id: { type: "string" },
        script: { type: "string", description: "To'liq skript matni (sahna-sahna yoki gap-gap) — ssenarist to'ldiradi" },
        caption: { type: "string", description: "Instagram caption — copywriter to'ldiradi" },
        cta: { type: "string", description: "Call-to-action matni — copywriter to'ldiradi" },
        direction_notes: {
          type: "string",
          description: "Format, kadr, joylashuv, pace, b-roll ko'rsatmalari — rejissor to'ldiradi",
        },
      },
      required: ["content_idea_id"],
      additionalProperties: false,
    },
  },
  {
    name: "update_content_schedule",
    description: "Mavjud content g'oyasini kalendarga joylashtiradi (scheduled_for) va/yoki statusini yangilaydi.",
    input_schema: {
      type: "object",
      properties: {
        content_idea_id: { type: "string" },
        scheduled_for: { type: "string", description: "YYYY-MM-DD" },
        status: { type: "string", enum: ["idea", "draft", "review", "approved", "published"] },
      },
      required: ["content_idea_id"],
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
    name: "save_daily_plan",
    description:
      "G'ayratjonning bitta kunlik rejasini (yoki kun oxiridagi hisobotini) saqlaydi/yangilaydi — plan_date bo'yicha upsert, shuning uchun ertalabki reja va kechqurungi check-in bir xil yozuvda birlashadi. Reja qo'yayotganda tasks'ni to'liq yubor (har biri {text, done: false}); check-in qilayotganda oldingi tasks'ni done holatini yangilab qayta yubor va reflection'ni to'ldir — mavjud maydonlarni bo'sh qoldirsang, ular o'chib ketadi, shuning uchun avval get_business_snapshot yoki suhbat tarixidan oldingi tasks ro'yxatini bilib ol.",
    input_schema: {
      type: "object",
      properties: {
        plan_date: { type: "string", description: "YYYY-MM-DD" },
        focus: { type: "string", description: "Kunning bitta asosiy ustuvor yo'nalishi (bitta gap)" },
        tasks: {
          type: "array",
          description: "To'liq vazifalar ro'yxati (mavjudlarini ham qayta yuborish kerak)",
          items: {
            type: "object",
            properties: {
              text: { type: "string" },
              done: { type: "boolean" },
            },
            required: ["text", "done"],
            additionalProperties: false,
          },
        },
        reflection: { type: "string", description: "Kun oxiridagi o'z-o'zini hisobot/xulosa" },
      },
      required: ["plan_date"],
      additionalProperties: false,
    },
  },
  {
    name: "get_business_snapshot",
    description:
      "Haqiqiy biznes ma'lumotlarini (to'lovlar, ro'yxatga olishlar, muddatli to'lov so'rovlari, kutish ro'yxati, so'nggi 14 kunlik intizom tarixi) bazadan real vaqtda o'qiydi. Moliya va sotuv tahlili qilishdan OLDIN har doim shuni chaqir — taxmin qilma, haqiqiy raqamlarga tayan.",
    input_schema: {
      type: "object",
      properties: {},
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
  agentKey: string,
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
            agent_key: agentKey,
          })
          .select("id")
          .single();
        if (error) throw error;
        return { tool_use_id: toolUse.id, content: `Saqlandi. id=${data.id}` };
      }

      case "save_script": {
        const payload: Record<string, unknown> = {
          content_idea_id: input.content_idea_id as string,
          agent_key: agentKey,
        };
        if (input.script !== undefined) payload.script = input.script;
        if (input.caption !== undefined) payload.caption = input.caption;
        if (input.cta !== undefined) payload.cta = input.cta;
        if (input.direction_notes !== undefined) payload.direction_notes = input.direction_notes;

        const { error } = await admin
          .from("ai_scripts")
          .upsert(payload as never, { onConflict: "content_idea_id" });
        if (error) throw error;
        return { tool_use_id: toolUse.id, content: "Saqlandi." };
      }

      case "update_content_schedule": {
        const payload: Record<string, unknown> = {};
        if (input.scheduled_for !== undefined) payload.scheduled_for = input.scheduled_for;
        if (input.status !== undefined) payload.status = input.status;
        const { error } = await admin
          .from("ai_content_ideas")
          .update(payload as never)
          .eq("id", input.content_idea_id as string);
        if (error) throw error;
        return { tool_use_id: toolUse.id, content: "Kalendar yangilandi." };
      }

      case "save_objection_response": {
        const { error } = await admin.from("ai_objections").upsert(
          {
            objection_text: input.objection_text as string,
            empathetic_response: input.empathetic_response as string,
            clarification: (input.clarification as string) ?? null,
            value_explanation: (input.value_explanation as string) ?? null,
            suggested_offer: (input.suggested_offer as string) ?? null,
            agent_key: agentKey,
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
          agent_key: agentKey,
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
            agent_key: agentKey,
          })
          .select("id")
          .single();
        if (error) throw error;
        return { tool_use_id: toolUse.id, content: `Task yaratildi. id=${data.id}` };
      }

      case "save_daily_plan": {
        const payload: Record<string, unknown> = {
          plan_date: input.plan_date as string,
          agent_key: agentKey,
        };
        if (input.focus !== undefined) payload.focus = input.focus;
        if (input.tasks !== undefined) payload.tasks = input.tasks;
        if (input.reflection !== undefined) payload.reflection = input.reflection;

        const { error } = await admin
          .from("ai_daily_plans")
          .upsert(payload as never, { onConflict: "plan_date" });
        if (error) throw error;
        return { tool_use_id: toolUse.id, content: "Kunlik reja saqlandi." };
      }

      case "get_business_snapshot": {
        const fourteenDaysAgo = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000)
          .toISOString()
          .slice(0, 10);

        const [payments, enrollments, installmentLeads, waitlist, dailyPlans] = await Promise.all([
          admin.from("payments").select("amount, status, course_id, created_at"),
          admin.from("enrollments").select("id, course_id, tier, created_at"),
          admin.from("installment_leads").select("status, monthly_amount, total_amount"),
          admin.from("waitlist").select("id, course_id"),
          admin
            .from("ai_daily_plans")
            .select("plan_date, focus, tasks, reflection")
            .gte("plan_date", fourteenDaysAgo)
            .order("plan_date", { ascending: false }),
        ]);

        const successfulPayments = (payments.data ?? []).filter((p) => p.status === "paid");
        const totalRevenue = successfulPayments.reduce((sum, p) => sum + (p.amount ?? 0), 0);
        const installmentByStatus: Record<string, number> = {};
        for (const lead of installmentLeads.data ?? []) {
          installmentByStatus[lead.status] = (installmentByStatus[lead.status] ?? 0) + 1;
        }

        const snapshot = {
          total_revenue: totalRevenue,
          successful_payments_count: successfulPayments.length,
          payments_by_status: (payments.data ?? []).reduce<Record<string, number>>((acc, p) => {
            acc[p.status] = (acc[p.status] ?? 0) + 1;
            return acc;
          }, {}),
          enrollments_count: (enrollments.data ?? []).length,
          installment_leads_by_status: installmentByStatus,
          waitlist_count: (waitlist.data ?? []).length,
          recent_daily_plans: dailyPlans.data ?? [],
        };
        return { tool_use_id: toolUse.id, content: JSON.stringify(snapshot) };
      }

      case "save_competitor_note": {
        const name = input.competitor_name as string;
        // Agents kept typing slightly different variants of the same real
        // competitor's name across separate research passes ("Qadam
        // Education", "Qadam Education (@qadam_education)", "Qadam
        // Education (@qadam_education / qadam.education)"...) — an exact
        // match on `name` missed all of those and silently created a new
        // duplicate competitor row each time. Normalizing away the
        // parenthetical handle/URL and anything after a separator before
        // comparing catches the real-world variants actually seen in
        // production; buildBrandContext also now lists existing
        // competitors so agents see the canonical name up front and don't
        // invent a new variant in the first place.
        const normalize = (s: string) =>
          s
            .replace(/\(.*?\)/g, "")
            .split(/[/@—–-]/)[0]
            .toLowerCase()
            .replace(/\s+/g, " ")
            .trim();
        const normalizedInput = normalize(name);

        const { data: allCompetitors } = await admin.from("ai_competitors").select("id, name");
        let competitor: { id: string } | null =
          (allCompetitors ?? []).find((c) => normalize(c.name) === normalizedInput) ?? null;

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
          agent_key: agentKey,
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
