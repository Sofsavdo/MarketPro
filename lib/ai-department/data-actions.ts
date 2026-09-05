"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/lms/admin-actions";
import { createAdminClient } from "@/lib/supabase/server";
import type { PersonMemory, AmaliyBiznesMemory, IzdoshMemory, VoiceRulesMemory } from "@/lib/ai-department/brand-types";

export async function listContentIdeas() {
  await requireAdmin();
  const admin = await createAdminClient();
  const [{ data: ideas }, { data: scripts }] = await Promise.all([
    admin.from("ai_content_ideas").select("*").order("created_at", { ascending: false }),
    admin.from("ai_scripts").select("*").order("created_at", { ascending: false }),
  ]);
  return (ideas ?? []).map((idea) => ({
    ...idea,
    scripts: (scripts ?? []).filter((s) => s.content_idea_id === idea.id),
  }));
}

export async function updateContentIdeaStatus(
  id: string,
  status: "idea" | "draft" | "review" | "approved" | "published",
) {
  await requireAdmin();
  const admin = await createAdminClient();
  await admin.from("ai_content_ideas").update({ status }).eq("id", id);
  revalidatePath("/admin/ai-department/content");
}

export async function listTasks() {
  await requireAdmin();
  const admin = await createAdminClient();
  const { data } = await admin.from("ai_tasks").select("*").order("created_at", { ascending: false });
  return data ?? [];
}

export async function updateTaskStatus(
  id: string,
  status: "backlog" | "planned" | "in_progress" | "review" | "approved" | "published",
) {
  await requireAdmin();
  const admin = await createAdminClient();
  await admin.from("ai_tasks").update({ status }).eq("id", id);
  revalidatePath("/admin/ai-department/tasks");
}

export async function listCompetitorsWithNotes() {
  await requireAdmin();
  const admin = await createAdminClient();
  const [{ data: competitors }, { data: notes }] = await Promise.all([
    admin.from("ai_competitors").select("*").order("created_at", { ascending: false }),
    admin.from("ai_competitor_notes").select("*").order("created_at", { ascending: false }),
  ]);
  return (competitors ?? []).map((c) => ({
    ...c,
    notes: (notes ?? []).filter((n) => n.competitor_id === c.id),
  }));
}

export async function listObjections() {
  await requireAdmin();
  const admin = await createAdminClient();
  const { data } = await admin.from("ai_objections").select("*").order("created_at", { ascending: false });
  return data ?? [];
}

export async function listReports() {
  await requireAdmin();
  const admin = await createAdminClient();
  const { data } = await admin.from("ai_reports").select("*").order("period_start", { ascending: false });
  return data ?? [];
}

export async function listAgentsForAdmin() {
  await requireAdmin();
  const admin = await createAdminClient();
  const { data } = await admin.from("ai_agents").select("*").order("created_at");
  return data ?? [];
}

/** key -> display name, for attributing a content idea/task/note/report/objection to the specialist that produced it. */
export async function getAgentNameMap(): Promise<Record<string, string>> {
  const agents = await listAgentsForAdmin();
  return Object.fromEntries(agents.map((a) => [a.key, a.name]));
}

export async function updateAgentPrompt(key: string, fields: { name: string; role_title: string; system_prompt: string }) {
  await requireAdmin();
  const admin = await createAdminClient();
  await admin
    .from("ai_agents")
    .update({ name: fields.name, role_title: fields.role_title, system_prompt: fields.system_prompt })
    .eq("key", key);
  revalidatePath("/admin/ai-department/agents");
}

export async function getBrandMemory() {
  await requireAdmin();
  const admin = await createAdminClient();
  const { data } = await admin.from("ai_brand_memory").select("*").eq("singleton", true).maybeSingle();
  return data;
}

export async function updateBrandMemory(fields: {
  person: PersonMemory;
  brand_amaliy_biznes: AmaliyBiznesMemory;
  brand_izdosh: IzdoshMemory;
  voice_rules: VoiceRulesMemory;
}) {
  await requireAdmin();
  const admin = await createAdminClient();

  await admin
    .from("ai_brand_memory")
    .update({
      person: fields.person,
      brand_amaliy_biznes: fields.brand_amaliy_biznes,
      brand_izdosh: fields.brand_izdosh,
      voice_rules: fields.voice_rules,
    })
    .eq("singleton", true);
  revalidatePath("/admin/ai-department/brand");
}
