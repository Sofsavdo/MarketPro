"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

/**
 * Reviews are gated by the `course_reviews` RLS insert policy itself
 * (`public.has_completed_course` — every lesson finished, not merely
 * "has access"), so this just needs the caller's own session client — no
 * admin bypass required, and no way to fake completion. Every submission
 * lands as 'pending': it only becomes publicly visible once an admin
 * approves it (see approveCourseReview/deleteCourseReview in
 * admin-actions.ts) — the RLS update policy's own `with check` additionally
 * refuses to let a student set status to anything but 'pending' themselves,
 * so this isn't just an app-layer convention.
 */
export async function submitCourseReview(
  courseId: string,
  slug: string,
  formData: FormData,
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("unauthorized");

  const rating = Number(formData.get("rating"));
  const comment = String(formData.get("comment") ?? "").trim() || null;
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
    throw new Error("invalid_rating");
  }

  const { error } = await supabase.from("course_reviews").upsert(
    { course_id: courseId, user_id: user.id, rating, comment, status: "pending" },
    { onConflict: "course_id,user_id" },
  );
  // RLS rejects this for anyone who hasn't finished every lesson — surfaced
  // as a plain error the form can catch, rather than a raw Postgres message.
  if (error) throw new Error("course_not_completed");

  revalidatePath(`/courses/${slug}`);
}

export async function submitLessonComment(
  lessonId: string,
  lessonHref: string,
  formData: FormData,
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("unauthorized");

  const comment = String(formData.get("comment") ?? "").trim();
  if (!comment) throw new Error("empty_comment");

  await supabase.from("lesson_comments").insert({
    lesson_id: lessonId,
    user_id: user.id,
    comment,
  });

  revalidatePath(lessonHref);
}
