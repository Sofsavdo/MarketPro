import { createAdminClient } from "@/lib/supabase/server";
import { SUBSCRIPTION_PRICE } from "@/lib/pricing";

/**
 * The client only tells us *what* the user wants to buy (a course, or a
 * subscription plan) — never trust the amount it sends, since a tampered
 * request could otherwise pay any price it likes. This resolves the real
 * price server-side.
 *
 * There's no self-serve "pay in N installments at checkout" option here —
 * that flow was retired (see lib/lms/installment-lead-actions.ts's own
 * comment) in favor of a lead an operator formalizes by phone
 * (convertInstallmentLead in admin-actions.ts, which creates the actual
 * installment_plans/installment_payments schedule). Once that schedule
 * exists, a student pays each scheduled month through installmentPaymentId
 * below — that's the only installment-related path this function handles.
 */
export async function resolvePurchase(params: {
  userId: string;
  courseId?: string;
  /** Which of the 3 tariffs — required whenever courseId is set. */
  tier?: "start" | "standard" | "pro";
  subscriptionPlan?: "monthly" | "yearly";
  /** Paying a specific already-scheduled installment instead of starting a new purchase. */
  installmentPaymentId?: string;
  /** A code the buyer typed at checkout — only applies to a fresh course/subscription purchase, not an installment or an already-scheduled payment. */
  promoCode?: string;
}): Promise<{
  amount: number;
  tier: "start" | "standard" | "pro" | null;
  installmentPaymentId: string | null;
  promoCode: string | null;
  discountAmount: number;
} | null> {
  const admin = await createAdminClient();

  if (params.installmentPaymentId) {
    const { data: installment } = await admin
      .from("installment_payments")
      .select("id, amount, status, plan_id")
      .eq("id", params.installmentPaymentId)
      .maybeSingle();

    if (!installment || installment.status !== "pending") return null;

    const { data: plan } = await admin
      .from("installment_plans")
      .select("user_id")
      .eq("id", installment.plan_id)
      .maybeSingle();

    if (!plan || plan.user_id !== params.userId) return null;

    return {
      amount: installment.amount,
      tier: null,
      installmentPaymentId: installment.id,
      promoCode: null,
      discountAmount: 0,
    };
  }

  const promo = params.promoCode ? await resolvePromoCode(admin, params.promoCode) : null;

  if (params.subscriptionPlan) {
    const amount = SUBSCRIPTION_PRICE[params.subscriptionPlan] ?? null;
    if (amount === null) return null;
    const discountAmount = promo ? Math.round((amount * promo.discount_percent) / 100) : 0;
    return {
      amount: amount - discountAmount,
      tier: null,
      installmentPaymentId: null,
      promoCode: promo?.code ?? null,
      discountAmount,
    };
  }

  if (params.courseId && params.tier) {
    const { data: course } = await admin
      .from("courses")
      .select("price_start, price_standard, price_pro, is_published")
      .eq("id", params.courseId)
      .maybeSingle();

    if (!course || !course.is_published) return null;

    const priceByTier = {
      start: course.price_start,
      standard: course.price_standard,
      pro: course.price_pro,
    } as const;
    const totalAmount = priceByTier[params.tier];

    // A course an admin published before setting real per-tier prices (they
    // default to 0 on creation) must never be purchasable for free — treat
    // it the same as an invalid purchase rather than silently charging 0.
    if (!Number.isFinite(totalAmount) || totalAmount <= 0) return null;

    const discountAmount = promo ? Math.round((totalAmount * promo.discount_percent) / 100) : 0;
    return {
      amount: totalAmount - discountAmount,
      tier: params.tier,
      installmentPaymentId: null,
      promoCode: promo?.code ?? null,
      discountAmount,
    };
  }

  return null;
}

/**
 * Exported so lib/lms/promo-actions.ts can offer a live discount preview in
 * the purchase dialog (validate a typed code and show the discounted price)
 * without duplicating this lookup — the actual checkout still always
 * re-resolves through resolvePurchase above, so a stale/tampered client
 * preview can never affect what's actually charged.
 */
export async function resolvePromoCode(admin: Awaited<ReturnType<typeof createAdminClient>>, code: string) {
  const { data: promo } = await admin
    .from("promo_codes")
    .select("code, discount_percent, max_uses, used_count, expires_at, active")
    .eq("code", code.trim().toUpperCase())
    .maybeSingle();

  if (!promo || !promo.active) return null;
  if (promo.expires_at && new Date(promo.expires_at) < new Date()) return null;
  if (promo.max_uses !== null && promo.used_count >= promo.max_uses) return null;

  return promo;
}
