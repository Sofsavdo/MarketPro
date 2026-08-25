"use server";

import { revalidatePath } from "next/cache";
import { createClient, createAdminClient } from "@/lib/supabase/server";

async function requireAdmin() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("unauthorized");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();
  if (profile?.role !== "admin") throw new Error("forbidden");
}

export async function toggleCoursePublished(courseId: string, isPublished: boolean) {
  await requireAdmin();
  const admin = await createAdminClient();
  await admin.from("courses").update({ is_published: isPublished }).eq("id", courseId);
  revalidatePath("/admin");
  revalidatePath("/[locale]/courses", "page");
}

export async function updateCourse(courseId: string, formData: FormData) {
  await requireAdmin();
  const admin = await createAdminClient();

  await admin
    .from("courses")
    .update({
      title_uz: String(formData.get("title_uz") ?? ""),
      title_ru: String(formData.get("title_ru") ?? ""),
      title_en: String(formData.get("title_en") ?? ""),
      description_uz: String(formData.get("description_uz") ?? ""),
      description_ru: String(formData.get("description_ru") ?? ""),
      description_en: String(formData.get("description_en") ?? ""),
      instructor_name: String(formData.get("instructor_name") ?? "") || null,
      instructor_avatar_url: String(formData.get("instructor_avatar_url") ?? "") || null,
      duration_months: Number(formData.get("duration_months") ?? 1),
      price_start: Number(formData.get("price_start") ?? 0),
      price_standard: Number(formData.get("price_standard") ?? 0),
      price_pro: Number(formData.get("price_pro") ?? 0),
    })
    .eq("id", courseId);

  revalidatePath(`/admin/courses/${courseId}`);
}

export async function updateLesson(lessonId: string, formData: FormData) {
  await requireAdmin();
  const admin = await createAdminClient();

  await admin
    .from("lessons")
    .update({
      title_uz: String(formData.get("title_uz") ?? ""),
      title_ru: String(formData.get("title_ru") ?? ""),
      title_en: String(formData.get("title_en") ?? ""),
      video_url: String(formData.get("video_url") ?? ""),
      content_uz: String(formData.get("content_uz") ?? ""),
      content_ru: String(formData.get("content_ru") ?? ""),
      content_en: String(formData.get("content_en") ?? ""),
      is_free_preview: formData.get("is_free_preview") === "on",
    })
    .eq("id", lessonId);

  revalidatePath(`/admin/lessons/${lessonId}`);
}

export async function addQuizQuestion(lessonId: string, formData: FormData) {
  await requireAdmin();
  const admin = await createAdminClient();

  const options_uz = String(formData.get("options_uz") ?? "")
    .split("\n")
    .map((s) => s.trim())
    .filter(Boolean);
  const options_ru = String(formData.get("options_ru") ?? "")
    .split("\n")
    .map((s) => s.trim())
    .filter(Boolean);
  const options_en = String(formData.get("options_en") ?? "")
    .split("\n")
    .map((s) => s.trim())
    .filter(Boolean);

  const { count } = await admin
    .from("quiz_questions")
    .select("id", { count: "exact", head: true })
    .eq("lesson_id", lessonId);

  await admin.from("quiz_questions").insert({
    lesson_id: lessonId,
    question_uz: String(formData.get("question_uz") ?? ""),
    question_ru: String(formData.get("question_ru") ?? ""),
    question_en: String(formData.get("question_en") ?? ""),
    options_uz,
    options_ru,
    options_en,
    correct_index: Number(formData.get("correct_index") ?? 0),
    order_index: count ?? 0,
  });

  revalidatePath(`/admin/lessons/${lessonId}`);
}

export async function deleteQuizQuestion(questionId: string, lessonId: string) {
  await requireAdmin();
  const admin = await createAdminClient();
  await admin.from("quiz_questions").delete().eq("id", questionId);
  revalidatePath(`/admin/lessons/${lessonId}`);
}

export async function createLiveSession(formData: FormData) {
  await requireAdmin();
  const admin = await createAdminClient();

  const scheduledDate = String(formData.get("scheduled_date") ?? "");
  const scheduledTime = String(formData.get("scheduled_time") ?? "");

  await admin.from("live_sessions").insert({
    course_id: String(formData.get("course_id") ?? ""),
    tier: formData.get("tier") as "standard" | "pro",
    title: String(formData.get("title") ?? ""),
    meet_url: String(formData.get("meet_url") ?? ""),
    scheduled_at: new Date(`${scheduledDate}T${scheduledTime}`).toISOString(),
    duration_minutes: Number(formData.get("duration_minutes") ?? 60),
  });

  revalidatePath("/admin/live-sessions");
}

export async function deleteLiveSession(sessionId: string) {
  await requireAdmin();
  const admin = await createAdminClient();
  await admin.from("live_sessions").delete().eq("id", sessionId);
  revalidatePath("/admin/live-sessions");
}

export async function answerSessionQuestion(questionId: string, sessionId: string, formData: FormData) {
  await requireAdmin();
  const admin = await createAdminClient();

  await admin
    .from("session_questions")
    .update({ answer: String(formData.get("answer") ?? ""), answered_at: new Date().toISOString() })
    .eq("id", questionId);

  revalidatePath(`/admin/live-sessions/${sessionId}`);
  revalidatePath(`/live/${sessionId}`);
}
