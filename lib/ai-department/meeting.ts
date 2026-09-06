import { getAgentRoster } from "@/lib/ai-department/agents";
import { runSpecialistAgent } from "@/lib/ai-department/orchestrator";
import { createAdminClient } from "@/lib/supabase/server";

/** Most recent Monday (UTC date, matches the plan_date/week_start convention used across ai_daily_plans/ai_meetings). */
function mostRecentMonday(d: Date): string {
  const day = d.getUTCDay(); // 0=Sun..6=Sat
  const diff = day === 0 ? 6 : day - 1;
  const monday = new Date(d);
  monday.setUTCDate(d.getUTCDate() - diff);
  return monday.toISOString().slice(0, 10);
}

function addDays(isoDate: string, days: number): string {
  const d = new Date(`${isoDate}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

export type WeeklyMeetingResult = { weekStart: string; summary: string; skipped: boolean };

/**
 * The "weekly meeting" the user asked for: every specialist contributes its
 * own take (not a live back-and-forth — a scheduled, once-a-week fan-out,
 * per the user's explicit choice), then the orchestrator agent synthesizes
 * one combined report and saves it via generate_report so it shows up
 * exactly like a chat-triggered report would. Idempotent on week_start —
 * calling this twice in the same week (a retried cron, a manual re-run) is
 * a no-op the second time.
 */
export async function runWeeklyMeeting(): Promise<WeeklyMeetingResult> {
  const admin = await createAdminClient();
  const weekStart = mostRecentMonday(new Date());

  const { data: existing } = await admin
    .from("ai_meetings")
    .select("id, summary")
    .eq("week_start", weekStart)
    .maybeSingle();
  if (existing) return { weekStart, summary: existing.summary ?? "", skipped: true };

  const roster = await getAgentRoster();
  const specialists = roster.filter((a) => a.key !== "orchestrator");

  const contributions = await Promise.all(
    specialists.map(async (agent) => {
      const task = `Bu HAFTALIK YIG'ILISH — get_business_snapshot tool'ini albatta chaqirib joriy holatni ko'r, so'ng o'z sohang ("${agent.role_title}") bo'yicha qisqa va aniq (4-6 gap) yoz: 1) bu hafta eng muhim voqea/natija, 2) hozirgi eng katta muammo yoki xavf, 3) keyingi hafta uchun ANIQ bitta tavsiya. Hech qanday tool bilan yozuv saqlama — bu faqat yig'ilishdagi og'zaki hisobot, javobing to'g'ridan-to'g'ri matn bo'lsin.`;
      const run = await runSpecialistAgent(agent.key, task);
      return { agent_key: agent.key, agent_name: agent.name, text: run.text };
    }),
  );

  const weekEnd = addDays(weekStart, 6);
  const synthesisTask = `Quyida ${weekStart} haftasi uchun barcha mutaxassislarning HAFTALIK YIG'ILISH hisobotlari berilgan. Bularni o'qib:
1. Umumiy holatni 1 paragrafda xulosala.
2. Keyingi haftaga eng muhim 3 ta ustuvorlikni belgila.
3. Agar biror mutaxassis jiddiy muammo/xavf haqida yozgan bo'lsa, create_task orqali aniq vazifa och.
4. SO'NGIDA generate_report tool'ini albatta chaqir: period="weekly", period_start="${weekStart}", period_end="${weekEnd}", summary — umumiy xulosa, start/stop/continue_doing — shu hisobotlardan kelib chiqqan aniq tavsiyalar.

=== MUTAXASSISLAR HISOBOTI ===
${contributions.map((c) => `### ${c.agent_name}\n${c.text}`).join("\n\n")}`;

  const synthesis = await runSpecialistAgent("orchestrator", synthesisTask);

  await admin.from("ai_meetings").insert({
    week_start: weekStart,
    contributions: contributions as unknown as never,
    summary: synthesis.text,
  });

  return { weekStart, summary: synthesis.text, skipped: false };
}
