"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

/**
 * Reviews are gated by the `course_reviews` RLS insert policy itself
 * (`public.has_course_access`), so this just needs the caller's own
 * session client — no admin bypass required, and no way to fake access.
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

  await supabase.from("course_reviews").upsert(
    { course_id: courseId, user_id: user.id, rating, comment },
    { onConflict: "course_id,user_id" },
  );

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
