import { createAdminClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/supabase/types";

export type AgentRow = Database["public"]["Tables"]["ai_agents"]["Row"];

const GLOBAL_RULES = `=== ENG MUHIM QOIDALAR (barcha mutaxassislar uchun) ===
1. Hech qachon fakt to'qima — noaniq narsa uchun "bu ma'lumotni tasdiqlay olmadim" de.
2. Hech qachon natijani yoki daromadni kafolatlama ("2 oyda falon million topasiz" kabi da'volar taqiqlangan).
3. Hech qachon fake testimonial, fake revenue yoki fake scarcity yaratma.
4. Raqobatchi kontentini copy qilma — faqat insight chiqarib, original kontent taklif qil (INSIGHT → ADAPT → ORIGINAL).
5. G'ayratjonni "guru"/"motivator"ga, Izdoshni oddiy "kurs sotuvchi"ga aylantirma.
6. Audience trust birinchi o'rinda — har content g'oyasini "bu odamga foyda beradimi, saqlab qo'yadimi, ulashadimi" savollari bilan tekshir.
7. Narx/aksiya/moliyaviy da'vo/huquqiy mavzularda ehtiyot bo'l — bular admin tasdig'ini talab qiladi, shuning uchun ularni to'g'ridan-to'g'ri "published" emas, "review" statusда saqla.
8. Joriy internet ma'lumoti kerak bo'lsa (raqobatchi, trend, yangilik) — web_search tool'idan foydalan, taxmin qilma.
9. Qisqa va aniq javob ber. Uzun matn emas, jadval/ro'yxat.
10. Har bir natijani mos tool orqali bazaga SAQLA — faqat chatda aytib qo'ymay. Tool chaqirmasdan berilgan javob yo'qoladi va admin panelda ko'rinmaydi.
11. BARCHA javoblar O'ZBEK TILIDA va O'ZBEKISTON KONTEKSTIDA (Uzum, Wildberries, Yandex, Telegram, Instagram, mahalla, nasiya).
12. Daromad, to'lov, ro'yxatga olish, muddatli to'lov yoki kutish ro'yxati haqida gapirishdan OLDIN get_business_snapshot tool'ini chaqir — bu haqiqiy DB raqamlari, taxmin emas. Bu tool bermagan raqamni hech qachon o'zing to'qib gapirma.`;

/**
 * Shared factual context (brand memory, product/pricing facts, objection
 * library) every agent — orchestrator and specialists alike — needs to stay
 * grounded and consistent. Assembled from DB so an admin edit takes effect
 * on the next message, no deploy needed.
 */
export async function buildBrandContext(): Promise<string> {
  const admin = await createAdminClient();
  const [{ data: memory }, { data: products }, { data: objections }] = await Promise.all([
    admin.from("ai_brand_memory").select("*").eq("singleton", true).maybeSingle(),
    admin.from("ai_products").select("*").order("status"),
    admin
      .from("ai_objections")
      .select("objection_text, empathetic_response, clarification, value_explanation, suggested_offer")
      .order("created_at"),
  ]);

  const memoryJson = JSON.stringify(
    {
      person: memory?.person ?? {},
      brand_amaliy_biznes: memory?.brand_amaliy_biznes ?? {},
      brand_izdosh: memory?.brand_izdosh ?? {},
      voice_rules: memory?.voice_rules ?? {},
    },
    null,
    2,
  );
  const productsJson = JSON.stringify(products ?? [], null, 2);
  const objectionsJson = JSON.stringify(objections ?? [], null, 2);

  return `=== BREND XOTIRASI (DB'dan, har doim eng yangi) ===
${memoryJson}

=== MAHSULOTLAR / NARXLAR (faqat shu tasdiqlangan narxlarni ishlat) ===
${productsJson}

=== E'TIROZLAR KUTUBXONASI ===
${objectionsJson}

${GLOBAL_RULES}`;
}

export async function getAgentRoster(): Promise<AgentRow[]> {
  const admin = await createAdminClient();
  const { data } = await admin.from("ai_agents").select("*").order("created_at");
  return data ?? [];
}

export async function getAgent(key: string): Promise<AgentRow | null> {
  const admin = await createAdminClient();
  const { data } = await admin.from("ai_agents").select("*").eq("key", key).maybeSingle();
  return data;
}

export async function buildOrchestratorSystemPrompt(): Promise<string> {
  const [orchestrator, roster, brandContext] = await Promise.all([
    getAgent("orchestrator"),
    getAgentRoster(),
    buildBrandContext(),
  ]);

  const specialists = roster.filter((a) => a.key !== "orchestrator");
  const rosterList = specialists.map((a) => `- ${a.key}: ${a.name} — ${a.role_title}`).join("\n");

  return `${orchestrator?.system_prompt ?? "Sen Orchestrator Agent'san."}

=== MAVJUD MUTAXASSISLAR (delegate_to_agent'ning agent_key qiymatlari) ===
${rosterList}

${brandContext}`;
}

/**
 * Last 14 days of G'ayratjon's daily plans/check-ins — only the
 * discipline_coach agent needs this (it has to know what was planned
 * yesterday to call out what got skipped), so it's kept out of every other
 * specialist's context instead of folding it into buildBrandContext.
 */
async function buildDisciplineContext(): Promise<string> {
  const admin = await createAdminClient();
  const fourteenDaysAgo = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
  const { data } = await admin
    .from("ai_daily_plans")
    .select("plan_date, focus, tasks, reflection")
    .gte("plan_date", fourteenDaysAgo)
    .order("plan_date", { ascending: false });

  return `=== SO'NGGI 14 KUNLIK REJA/CHECK-IN TARIXI (DB'dan) ===
${JSON.stringify(data ?? [], null, 2)}`;
}

export async function buildSpecialistSystemPrompt(agent: AgentRow, taskInstruction: string): Promise<string> {
  const [brandContext, disciplineContext] = await Promise.all([
    buildBrandContext(),
    agent.key === "discipline_coach" ? buildDisciplineContext() : Promise.resolve(null),
  ]);

  return `${agent.system_prompt}

${brandContext}
${disciplineContext ? `\n${disciplineContext}\n` : ""}
=== SENGA BERILGAN ANIQ VAZIFA ===
${taskInstruction}`;
}
