"use server";

import { revalidatePath } from "next/cache";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { computeMonthlyInstallment } from "@/lib/pricing";

/**
 * Registers interest in the 12-month installment plan — no payment happens
 * here. An operator calls the student to formalize it (see
 * convertInstallmentLead in admin-actions.ts), so the amounts are computed
 * server-side from the course's current price rather than trusted from the
 * client, same reasoning as lib/payments/resolve-amount.ts.
 */
export async function submitInstallmentLead(
  courseId: string,
  tier: "start" | "standard" | "pro",
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("unauthorized");

  const admin = await createAdminClient();
  const { data: course } = await admin
    .from("courses")
    .select("price_start, price_standard, price_pro, is_published")
    .eq("id", courseId)
    .maybeSingle();
  if (!course || !course.is_published) throw new Error("invalid_course");

  const priceByTier = {
    start: course.price_start,
    standard: course.price_standard,
    pro: course.price_pro,
  } as const;
  // Same reasoning as resolvePurchase: a course published before its
  // per-tier prices are set (they default to 0) must not generate a "0
  // so'm" installment lead for an operator to call about.
  if (!Number.isFinite(priceByTier[tier]) || priceByTier[tier] <= 0) throw new Error("invalid_course");

  // Avoid piling up duplicate leads if a student taps the button more than
  // once (double-click, revisiting the page) — an open request for this
  // course is enough until an operator acts on it.
  const { data: existing } = await supabase
    .from("installment_leads")
    .select("id")
    .eq("user_id", user.id)
    .eq("course_id", courseId)
    .in("status", ["new", "contacted"])
    .maybeSingle();
  if (existing) return;

  const monthlyAmount = computeMonthlyInstallment(priceByTier[tier]);
  const totalAmount = monthlyAmount * 12;

  await supabase.from("installment_leads").insert({
    user_id: user.id,
    course_id: courseId,
    tier,
    monthly_amount: monthlyAmount,
    total_amount: totalAmount,
  });

  revalidatePath("/admin/installments");
}
