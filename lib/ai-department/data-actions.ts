"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/lms/admin-actions";
import { createAdminClient } from "@/lib/supabase/server";

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

export async function getBrandMemory() {
  await requireAdmin();
  const admin = await createAdminClient();
  const { data } = await admin.from("ai_brand_memory").select("*").eq("singleton", true).maybeSingle();
  return data;
}

export async function updateBrandMemory(fields: {
  person?: string;
  brand_amaliy_biznes?: string;
  brand_izdosh?: string;
  voice_rules?: string;
}) {
  await requireAdmin();
  const admin = await createAdminClient();

  function parse(key: string, value: string | undefined): Record<string, unknown> | undefined {
    if (value === undefined) return undefined;
    try {
      return JSON.parse(value);
    } catch {
      throw new Error(`invalid_json:${key}`);
    }
  }

  await admin
    .from("ai_brand_memory")
    .update({
      person: parse("person", fields.person),
      brand_amaliy_biznes: parse("brand_amaliy_biznes", fields.brand_amaliy_biznes),
      brand_izdosh: parse("brand_izdosh", fields.brand_izdosh),
      voice_rules: parse("voice_rules", fields.voice_rules),
    })
    .eq("singleton", true);
  revalidatePath("/admin/ai-department/brand");
}
