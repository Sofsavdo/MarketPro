import { createClient } from "@/lib/supabase/server";
import type { PlanTier } from "@/lib/supabase/types";

export interface LessonAccess {
  hasCourseAccess: boolean;
  tier: PlanTier | null;
  source: "subscription" | "purchase" | "none";
}

/**
 * Whether the current user can access `courseId` at all — via an active
 * subscription (covers every course) or a direct one-time purchase
 * (enrollment) of that specific course.
 */
export async function getLessonAccess(
  userId: string | null,
  courseId: string,
): Promise<LessonAccess> {
  if (!userId) {
    return { hasCourseAccess: false, tier: null, source: "none" };
  }

  const supabase = await createClient();

  const { data: subscription } = await supabase
    .from("subscriptions")
    .select("status, current_period_end")
    .eq("user_id", userId)
    .eq("status", "active")
    .gt("current_period_end", new Date().toISOString())
    .maybeSingle();

  if (subscription) {
    return { hasCourseAccess: true, tier: "pro", source: "subscription" };
  }

  const { data: enrollment } = await supabase
    .from("enrollments")
    .select("tier")
    .eq("user_id", userId)
    .eq("course_id", courseId)
    .maybeSingle();

  if (enrollment) {
    if (await hasOverdueInstallment(userId, courseId)) {
      return { hasCourseAccess: false, tier: enrollment.tier as PlanTier, source: "none" };
    }
    return {
      hasCourseAccess: true,
      tier: enrollment.tier as PlanTier,
      source: "purchase",
    };
  }

  return { hasCourseAccess: false, tier: null, source: "none" };
}

/**
 * Business plan §9.7 (Cash Flow Himoyasi): if a student is on an
 * installment plan and misses a due date, access is suspended until they
 * catch up — checked live against `due_date`, no cron needed.
 */
async function hasOverdueInstallment(userId: string, courseId: string): Promise<boolean> {
  const supabase = await createClient();

  const { data: plan } = await supabase
    .from("installment_plans")
    .select("id")
    .eq("user_id", userId)
    .eq("course_id", courseId)
    .maybeSingle();

  if (!plan) return false;

  const { count } = await supabase
    .from("installment_payments")
    .select("id", { count: "exact", head: true })
    .eq("plan_id", plan.id)
    .eq("status", "pending")
    .lt("due_date", new Date().toISOString());

  return !!count && count > 0;
}

/**
 * A lesson is locked when the user lacks course access, or when the
 * immediately preceding lesson (order_index - 1) within the same course
 * has not been completed yet. The first lesson of a course (order_index 0)
 * and any lesson flagged `is_free_preview` are always unlocked for preview,
 * though the video/content itself is still gated by `hasCourseAccess` in
 * the page that renders it.
 */
export async function isLessonLocked(
  userId: string | null,
  courseId: string,
  orderIndex: number,
): Promise<boolean> {
  if (orderIndex === 0) return false;

  if (!userId) return true;

  const supabase = await createClient();

  const { data: previousLesson } = await supabase
    .from("lessons")
    .select("id")
    .eq("course_id", courseId)
    .eq("order_index", orderIndex - 1)
    .maybeSingle();

  if (!previousLesson) return false;

  const { data: progress } = await supabase
    .from("user_progress")
    .select("completed, quiz_passed")
    .eq("user_id", userId)
    .eq("lesson_id", previousLesson.id)
    .maybeSingle();

  if (!progress?.completed) return true;

  // If the previous lesson carries a quiz, it must be passed too.
  const { count: questionCount } = await supabase
    .from("quiz_questions")
    .select("id", { count: "exact", head: true })
    .eq("lesson_id", previousLesson.id);

  if (questionCount && questionCount > 0 && !progress.quiz_passed) {
    return true;
  }

  return false;
}

/**
 * Marks a lesson complete for the user and returns the id of the next
 * lesson in the course (if any), so the UI can navigate/unlock it.
 *
 * Does NOT take a `quizPassed` flag from the caller — a client could send
 * whatever value it likes. Instead it reads whatever
 * POST /api/lessons/quiz/submit already recorded server-side for this
 * lesson, and refuses to complete a lesson whose quiz hasn't actually been
 * passed yet.
 */
export async function completeLesson(userId: string, courseId: string, lessonId: string) {
  const supabase = await createClient();

  const { count: questionCount } = await supabase
    .from("quiz_questions")
    .select("id", { count: "exact", head: true })
    .eq("lesson_id", lessonId);

  const { data: existingProgress } = await supabase
    .from("user_progress")
    .select("quiz_passed")
    .eq("user_id", userId)
    .eq("lesson_id", lessonId)
    .maybeSingle();

  const hasQuiz = !!questionCount && questionCount > 0;
  if (hasQuiz && !existingProgress?.quiz_passed) {
    throw new Error("quiz_not_passed");
  }

  await supabase.from("user_progress").upsert(
    {
      user_id: userId,
      course_id: courseId,
      lesson_id: lessonId,
      completed: true,
      quiz_passed: hasQuiz ? true : null,
      completed_at: new Date().toISOString(),
    },
    { onConflict: "user_id,lesson_id" },
  );

  const { data: current } = await supabase
    .from("lessons")
    .select("order_index")
    .eq("id", lessonId)
    .single();

  if (!current) return null;

  const { data: next } = await supabase
    .from("lessons")
    .select("id")
    .eq("course_id", courseId)
    .eq("order_index", current.order_index + 1)
    .maybeSingle();

  return next?.id ?? null;
}
