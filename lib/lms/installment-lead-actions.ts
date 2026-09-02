"use server";

import { revalidatePath } from "next/cache";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { computeMonthlyInstallment } from "@/lib/pricing";
import { normalizePhone } from "@/lib/utils";

/**
 * Registers interest in the 12-month installment plan — no payment happens
 * here. An operator calls the student to formalize it (see
 * convertInstallmentLead in admin-actions.ts), so the amounts are computed
 * server-side from the course's current price rather than trusted from the
 * client, same reasoning as lib/payments/resolve-amount.ts.
 *
 * Works for a logged-out visitor too (guestName/guestPhone) — asking someone
 * to fully register before they can even say "I'm interested in installments"
 * was real signup friction on a request that isn't a purchase yet. The admin
 * panel resolves a guest lead to an account once one exists with a matching
 * phone number (see admin/installments/page.tsx).
 */
export async function submitInstallmentLead(
  courseId: string,
  tier: "start" | "standard" | "pro",
  termsAccepted: boolean,
  guestName?: string,
  guestPhone?: string,
) {
  if (!termsAccepted) throw new Error("terms_not_accepted");

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user && (!guestName?.trim() || !guestPhone?.trim())) throw new Error("guest_info_required");

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

  const normalizedGuestPhone = guestPhone ? normalizePhone(guestPhone) : null;

  // Avoid piling up duplicate leads if a student taps the button more than
  // once (double-click, revisiting the page) — an open request for this
  // course is enough until an operator acts on it. Matched by user_id when
  // logged in, by phone when a guest.
  const dedupeQuery = admin
    .from("installment_leads")
    .select("id")
    .eq("course_id", courseId)
    .in("status", ["new", "contacted"]);
  const { data: existing } = user
    ? await dedupeQuery.eq("user_id", user.id).maybeSingle()
    : await dedupeQuery.eq("guest_phone", normalizedGuestPhone!).maybeSingle();
  if (existing) return;

  const monthlyAmount = computeMonthlyInstallment(priceByTier[tier]);
  const totalAmount = monthlyAmount * 12;

  await admin.from("installment_leads").insert({
    user_id: user?.id ?? null,
    guest_name: user ? null : guestName!.trim(),
    guest_phone: user ? null : normalizedGuestPhone,
    course_id: courseId,
    tier,
    monthly_amount: monthlyAmount,
    total_amount: totalAmount,
    terms_accepted_at: new Date().toISOString(),
  });

  revalidatePath("/admin/installments");
}
