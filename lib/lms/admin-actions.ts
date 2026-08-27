"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { uploadImage } from "@/lib/supabase/storage";
import { revokeAccessForPayment } from "@/lib/payments/grant-access";

function slugify(input: string) {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

/**
 * Lesson order_index is a single sequence across the whole course (module 1's
 * lessons, then module 2's, etc.) — that's what isLessonLocked/completeLesson
 * walk with `order_index - 1` / `+ 1` to find the previous/next lesson, and a
 * gap or a per-module restart makes that lookup silently wrong (a gap reads
 * as "no previous lesson", which unlocks a lesson that shouldn't be).
 * Call this after any insert/delete/reorder that touches lessons or module
 * order so the sequence stays contiguous and matches module order.
 */
async function renumberCourseLessons(
  admin: Awaited<ReturnType<typeof createAdminClient>>,
  courseId: string,
) {
  const { data: modules } = await admin
    .from("modules")
    .select("id")
    .eq("course_id", courseId)
    .order("order_index", { ascending: true });

  const { data: lessons } = await admin
    .from("lessons")
    .select("id, module_id, order_index")
    .eq("course_id", courseId)
    .order("order_index", { ascending: true });

  if (!modules || !lessons) return;

  let nextIndex = 0;
  for (const mod of modules) {
    for (const lesson of lessons.filter((l) => l.module_id === mod.id)) {
      if (lesson.order_index !== nextIndex) {
        await admin.from("lessons").update({ order_index: nextIndex }).eq("id", lesson.id);
      }
      nextIndex += 1;
    }
  }
}

async function requireAdmin(): Promise<{ userId: string }> {
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

  return { userId: user.id };
}

export async function toggleCoursePublished(courseId: string, isPublished: boolean) {
  await requireAdmin();
  const admin = await createAdminClient();
  await admin.from("courses").update({ is_published: isPublished }).eq("id", courseId);
  revalidatePath("/admin");
  revalidatePath("/[locale]", "page");
  revalidatePath("/[locale]/courses", "page");
}

export async function updateCourse(courseId: string, formData: FormData) {
  await requireAdmin();
  const admin = await createAdminClient();

  // Only a newly-chosen file replaces the cover — an empty file input on a
  // routine "save the rest of the form" submit must not wipe out the cover
  // the course already has.
  const newCoverUrl = await uploadImage("course-covers", formData.get("cover_file") as File | null);

  await admin
    .from("courses")
    .update({
      title_uz: String(formData.get("title_uz") ?? ""),
      title_ru: String(formData.get("title_ru") ?? ""),
      title_en: String(formData.get("title_en") ?? ""),
      description_uz: String(formData.get("description_uz") ?? ""),
      description_ru: String(formData.get("description_ru") ?? ""),
      description_en: String(formData.get("description_en") ?? ""),
      ...(newCoverUrl ? { cover_url: newCoverUrl } : {}),
      instructor_name: String(formData.get("instructor_name") ?? "") || null,
      instructor_avatar_url: String(formData.get("instructor_avatar_url") ?? "") || null,
      duration_months: Number(formData.get("duration_months") ?? 1),
      price_start: Number(formData.get("price_start") ?? 0),
      price_standard: Number(formData.get("price_standard") ?? 0),
      price_pro: Number(formData.get("price_pro") ?? 0),
    })
    .eq("id", courseId);

  revalidatePath(`/admin/courses/${courseId}`);
  revalidatePath("/[locale]", "page");
  revalidatePath("/[locale]/courses", "page");
  // The form submit itself gave the admin no feedback that anything
  // happened (revalidatePath alone re-renders the same page with the same
  // values, which looks identical to "nothing saved") — redirecting with a
  // marker the page reads to show a confirmation banner fixes that.
  redirect(`/admin/courses/${courseId}?saved=1`);
}

export async function createCourse(formData: FormData) {
  await requireAdmin();
  const admin = await createAdminClient();

  const title_uz = String(formData.get("title_uz") ?? "");
  const baseSlug = slugify(title_uz) || "kurs";
  let slug = baseSlug;
  let suffix = 1;
  while (true) {
    const { data: existing } = await admin.from("courses").select("id").eq("slug", slug).maybeSingle();
    if (!existing) break;
    suffix += 1;
    slug = `${baseSlug}-${suffix}`;
  }

  const { count } = await admin.from("courses").select("id", { count: "exact", head: true });
  const coverUrl = await uploadImage("course-covers", formData.get("cover_file") as File | null);

  const { data: course, error } = await admin
    .from("courses")
    .insert({
      slug,
      title_uz,
      title_ru: String(formData.get("title_ru") ?? ""),
      title_en: String(formData.get("title_en") ?? ""),
      description_uz: String(formData.get("description_uz") ?? ""),
      description_ru: String(formData.get("description_ru") ?? ""),
      description_en: String(formData.get("description_en") ?? ""),
      cover_url: coverUrl,
      duration_months: Number(formData.get("duration_months") ?? 1),
      price_start: 0,
      price_standard: 0,
      price_pro: 0,
      order_index: count ?? 0,
      is_published: false,
    })
    .select("id")
    .single();

  if (error || !course) throw new Error(error?.message ?? "Kurs yaratilmadi");

  revalidatePath("/admin");
  revalidatePath("/[locale]", "page");
  revalidatePath("/[locale]/courses", "page");
  redirect(`/admin/courses/${course.id}`);
}

export async function updateLesson(lessonId: string, formData: FormData) {
  await requireAdmin();
  const admin = await createAdminClient();

  const newThumbnailUrl = await uploadImage(
    "lesson-thumbnails",
    formData.get("thumbnail_file") as File | null,
  );

  await admin
    .from("lessons")
    .update({
      title_uz: String(formData.get("title_uz") ?? ""),
      title_ru: String(formData.get("title_ru") ?? ""),
      title_en: String(formData.get("title_en") ?? ""),
      video_url: String(formData.get("video_url") ?? ""),
      ...(newThumbnailUrl ? { thumbnail_url: newThumbnailUrl } : {}),
      content_uz: String(formData.get("content_uz") ?? ""),
      content_ru: String(formData.get("content_ru") ?? ""),
      content_en: String(formData.get("content_en") ?? ""),
      is_free_preview: formData.get("is_free_preview") === "on",
    })
    .eq("id", lessonId);

  revalidatePath(`/admin/lessons/${lessonId}`);
}

export async function createModule(courseId: string, formData: FormData) {
  await requireAdmin();
  const admin = await createAdminClient();

  const { count } = await admin
    .from("modules")
    .select("id", { count: "exact", head: true })
    .eq("course_id", courseId);

  await admin.from("modules").insert({
    course_id: courseId,
    title_uz: String(formData.get("title_uz") ?? ""),
    title_ru: String(formData.get("title_ru") ?? ""),
    title_en: String(formData.get("title_en") ?? ""),
    order_index: count ?? 0,
  });

  revalidatePath(`/admin/courses/${courseId}`);
}

export async function deleteModule(moduleId: string, courseId: string) {
  await requireAdmin();
  const admin = await createAdminClient();
  await admin.from("modules").delete().eq("id", moduleId);
  await renumberCourseLessons(admin, courseId);
  revalidatePath(`/admin/courses/${courseId}`);
}

export async function createLesson(courseId: string, moduleId: string, formData: FormData) {
  await requireAdmin();
  const admin = await createAdminClient();

  // Placeholder order_index high enough to sort after every existing lesson
  // in the course; renumberCourseLessons below then settles it into the
  // correct slot at the end of this module's lessons.
  const { data: lesson, error } = await admin
    .from("lessons")
    .insert({
      course_id: courseId,
      module_id: moduleId,
      title_uz: String(formData.get("title_uz") ?? ""),
      title_ru: String(formData.get("title_ru") ?? ""),
      title_en: String(formData.get("title_en") ?? ""),
      order_index: 1_000_000,
    })
    .select("id")
    .single();

  if (error || !lesson) throw new Error(error?.message ?? "Dars yaratilmadi");

  await renumberCourseLessons(admin, courseId);

  revalidatePath(`/admin/courses/${courseId}`);
  redirect(`/admin/lessons/${lesson.id}`);
}

export async function deleteLesson(lessonId: string, courseId: string) {
  await requireAdmin();
  const admin = await createAdminClient();
  await admin.from("lessons").delete().eq("id", lessonId);
  await renumberCourseLessons(admin, courseId);
  revalidatePath(`/admin/courses/${courseId}`);
}

/**
 * Swaps order_index with the lesson immediately before/after it within the
 * same module — a minimal reorder UI (up/down arrows) instead of drag-drop.
 */
export async function moveLesson(lessonId: string, courseId: string, direction: "up" | "down") {
  await requireAdmin();
  const admin = await createAdminClient();

  const { data: lesson } = await admin
    .from("lessons")
    .select("id, module_id, order_index")
    .eq("id", lessonId)
    .single();
  if (!lesson) return;

  const { data: siblings } = await admin
    .from("lessons")
    .select("id, order_index")
    .eq("module_id", lesson.module_id)
    .order("order_index", { ascending: true });
  if (!siblings) return;

  const index = siblings.findIndex((s) => s.id === lessonId);
  const swapIndex = direction === "up" ? index - 1 : index + 1;
  if (swapIndex < 0 || swapIndex >= siblings.length) return;

  const sibling = siblings[swapIndex];
  await admin.from("lessons").update({ order_index: sibling.order_index }).eq("id", lesson.id);
  await admin.from("lessons").update({ order_index: lesson.order_index }).eq("id", sibling.id);

  revalidatePath(`/admin/courses/${courseId}`);
}

export async function moveModule(moduleId: string, courseId: string, direction: "up" | "down") {
  await requireAdmin();
  const admin = await createAdminClient();

  const { data: mod } = await admin
    .from("modules")
    .select("id, order_index")
    .eq("id", moduleId)
    .single();
  if (!mod) return;

  const { data: siblings } = await admin
    .from("modules")
    .select("id, order_index")
    .eq("course_id", courseId)
    .order("order_index", { ascending: true });
  if (!siblings) return;

  const index = siblings.findIndex((s) => s.id === moduleId);
  const swapIndex = direction === "up" ? index - 1 : index + 1;
  if (swapIndex < 0 || swapIndex >= siblings.length) return;

  const sibling = siblings[swapIndex];
  await admin.from("modules").update({ order_index: sibling.order_index }).eq("id", mod.id);
  await admin.from("modules").update({ order_index: mod.order_index }).eq("id", sibling.id);
  await renumberCourseLessons(admin, courseId);

  revalidatePath(`/admin/courses/${courseId}`);
}

export async function addLessonMaterial(lessonId: string, formData: FormData) {
  await requireAdmin();
  const admin = await createAdminClient();

  const { count } = await admin
    .from("lesson_materials")
    .select("id", { count: "exact", head: true })
    .eq("lesson_id", lessonId);

  await admin.from("lesson_materials").insert({
    lesson_id: lessonId,
    title_uz: String(formData.get("title_uz") ?? ""),
    title_ru: String(formData.get("title_ru") ?? ""),
    title_en: String(formData.get("title_en") ?? ""),
    file_url: String(formData.get("file_url") ?? ""),
    file_type: String(formData.get("file_type") ?? "pdf"),
    order_index: count ?? 0,
  });

  revalidatePath(`/admin/lessons/${lessonId}`);
}

export async function deleteLessonMaterial(materialId: string, lessonId: string) {
  await requireAdmin();
  const admin = await createAdminClient();
  await admin.from("lesson_materials").delete().eq("id", materialId);
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

  // The date/time inputs are the admin's wall-clock time in Tashkent — without
  // an explicit offset, `new Date("...T...")` parses as the server process's
  // local time (usually UTC on hosting), which would silently shift every
  // scheduled class by 5 hours. Uzbekistan doesn't observe DST, so a fixed
  // +05:00 offset is always correct.
  const requiredTier = formData.get("required_tier") === "pro" ? "pro" : "standard";

  await admin.from("live_sessions").insert({
    course_id: String(formData.get("course_id") ?? ""),
    title: String(formData.get("title") ?? ""),
    meet_url: String(formData.get("meet_url") ?? ""),
    scheduled_at: new Date(`${scheduledDate}T${scheduledTime}:00+05:00`).toISOString(),
    duration_minutes: Number(formData.get("duration_minutes") ?? 60),
    required_tier: requiredTier,
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

/**
 * Implements the refund policy (§4.2/§4.2 of the business plan, and
 * /refund-policy): marks the payment refunded and revokes whatever it
 * granted — the course enrollment, or the active subscription. Progress
 * (user_progress) is left alone; if the student is re-enrolled later
 * there's no reason to make them redo lessons they already watched.
 */
export async function refundPayment(paymentId: string) {
  await requireAdmin();
  const admin = await createAdminClient();

  const { data: payment } = await admin.from("payments").select("*").eq("id", paymentId).single();
  if (!payment || payment.status !== "paid") return;

  await admin.from("payments").update({ status: "refunded" }).eq("id", paymentId);
  await revokeAccessForPayment(paymentId);

  revalidatePath("/admin/payments");
}

// ============================================================
// CRM / downsell — operator tools for turning a "start"-only subscriber
// into a VIP course buyer. See app/[locale]/admin/leads/page.tsx.
// ============================================================

export async function updateLeadStatus(userId: string, status: string) {
  await requireAdmin();
  const admin = await createAdminClient();
  await admin
    .from("profiles")
    .update({ lead_status: status as "new_lead" | "vip_offered" | "downsell_subscribed" })
    .eq("id", userId);
  revalidatePath("/admin/leads");
}

export async function addOperatorCallNote(userId: string, formData: FormData) {
  const caller = await requireAdmin();
  const admin = await createAdminClient();
  await admin.from("operator_call_logs").insert({
    user_id: userId,
    note: String(formData.get("note") ?? ""),
    created_by: caller.userId,
  });
  revalidatePath("/admin/leads");
}

/**
 * The downsell close: a subscriber who's been offered a VIP course within
 * the last ~14 days of paying their subscription gets that subscription
 * payment credited straight off the VIP price, instead of paying for both
 * in full. This is an operator-triggered manual settlement (the customer
 * already agreed over a call/Telegram), not a new Click/Payme charge — it
 * records a 'manual' payment for the audit trail and grants VIP access
 * immediately.
 */
export async function upgradeToVipWithCredit(userId: string, formData: FormData) {
  await requireAdmin();
  const admin = await createAdminClient();
  const courseId = String(formData.get("courseId") ?? "");

  const { data: course } = await admin
    .from("courses")
    .select("price_pro")
    .eq("id", courseId)
    .maybeSingle();
  if (!course) throw new Error("course_not_found");

  const { data: lastSubPayment } = await admin
    .from("payments")
    .select("amount")
    .eq("user_id", userId)
    .eq("status", "paid")
    .not("subscription_plan", "is", null)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  // Downsell always credits toward Pro — the closest match to what
  // "upgrade from your subscription" has always meant here (live classes +
  // mentor feedback included).
  const credit = Math.min(lastSubPayment?.amount ?? 0, course.price_pro);
  const finalAmount = course.price_pro - credit;

  await admin.from("payments").insert({
    user_id: userId,
    provider: "manual",
    amount: finalAmount,
    discount_amount: credit,
    status: "paid",
    course_id: courseId,
    tier: "pro",
  });

  await admin.from("enrollments").upsert(
    { user_id: userId, course_id: courseId, source: "downsell_credit", tier: "pro" },
    { onConflict: "user_id,course_id" },
  );

  await admin.from("profiles").update({ lead_status: "downsell_subscribed" }).eq("id", userId);

  revalidatePath("/admin/leads");
  revalidatePath("/admin/payments");
}

export async function createPromoCode(formData: FormData) {
  await requireAdmin();
  const admin = await createAdminClient();

  const code = String(formData.get("code") ?? "").trim().toUpperCase();
  const discountPercent = Number(formData.get("discount_percent"));
  const maxUsesRaw = String(formData.get("max_uses") ?? "").trim();
  const expiresAtRaw = String(formData.get("expires_at") ?? "").trim();

  if (!code || !Number.isInteger(discountPercent) || discountPercent < 1 || discountPercent > 100) {
    throw new Error("invalid_promo_code");
  }

  await admin.from("promo_codes").insert({
    code,
    discount_percent: discountPercent,
    max_uses: maxUsesRaw ? Number(maxUsesRaw) : null,
    expires_at: expiresAtRaw ? new Date(expiresAtRaw).toISOString() : null,
  });

  revalidatePath("/admin/promo-codes");
}

export async function togglePromoCode(promoCodeId: string, active: boolean) {
  await requireAdmin();
  const admin = await createAdminClient();
  await admin.from("promo_codes").update({ active: !active }).eq("id", promoCodeId);
  revalidatePath("/admin/promo-codes");
}

export async function markInstallmentLeadContacted(leadId: string) {
  await requireAdmin();
  const admin = await createAdminClient();
  await admin.from("installment_leads").update({ status: "contacted" }).eq("id", leadId);
  revalidatePath("/admin/installments");
}

export async function declineInstallmentLead(leadId: string) {
  await requireAdmin();
  const admin = await createAdminClient();
  await admin.from("installment_leads").update({ status: "declined" }).eq("id", leadId);
  revalidatePath("/admin/installments");
}

/**
 * Grants VIP access once the operator has formalized the 12-month
 * installment deal by phone (nasiya) — actual monthly collection happens
 * outside this app for now (manual Click links, or Atmos auto-debit once
 * that's wired up), so this just records the sale and unlocks the course,
 * the same "manual" payment pattern as upgradeToVipWithCredit.
 */
export async function convertInstallmentLead(
  leadId: string,
  userId: string,
  courseId: string,
  tier: "start" | "standard" | "pro",
  totalAmount: number,
) {
  await requireAdmin();
  const admin = await createAdminClient();

  await admin.from("payments").insert({
    user_id: userId,
    provider: "manual",
    amount: totalAmount,
    status: "paid",
    course_id: courseId,
    tier,
  });

  await admin.from("enrollments").upsert(
    { user_id: userId, course_id: courseId, source: "purchase", tier },
    { onConflict: "user_id,course_id" },
  );

  await admin.from("installment_leads").update({ status: "converted" }).eq("id", leadId);

  revalidatePath("/admin/installments");
}

// ============================================================
// Course review moderation — a review only becomes publicly visible once
// an admin approves it (course_reviews RLS: 'pending' by default, and a
// student's own update can never set it to 'approved' themselves). See
// app/[locale]/admin/reviews and components/course/course-reviews.tsx.
// ============================================================

export async function approveCourseReview(reviewId: string) {
  await requireAdmin();
  const admin = await createAdminClient();
  const { data: review } = await admin
    .from("course_reviews")
    .update({ status: "approved" })
    .eq("id", reviewId)
    .select("course_id")
    .single();

  revalidatePath("/admin/reviews");
  if (review) {
    const { data: course } = await admin.from("courses").select("slug").eq("id", review.course_id).maybeSingle();
    if (course) revalidatePath(`/[locale]/courses/${course.slug}`, "page");
  }
}

export async function deleteCourseReview(reviewId: string) {
  await requireAdmin();
  const admin = await createAdminClient();
  const { data: review } = await admin
    .from("course_reviews")
    .delete()
    .eq("id", reviewId)
    .select("course_id")
    .single();

  revalidatePath("/admin/reviews");
  if (review) {
    const { data: course } = await admin.from("courses").select("slug").eq("id", review.course_id).maybeSingle();
    if (course) revalidatePath(`/[locale]/courses/${course.slug}`, "page");
  }
}
