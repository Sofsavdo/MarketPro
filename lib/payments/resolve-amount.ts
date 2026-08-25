import { createAdminClient } from "@/lib/supabase/server";
import { SUBSCRIPTION_PRICE } from "@/lib/pricing";
import { createInstallmentPlan } from "@/lib/payments/installments";

/**
 * The client only tells us *what* the user wants to buy (course+tier, or a
 * subscription plan) — never trust the amount it sends, since a tampered
 * request could otherwise pay any price it likes. This resolves the real
 * price server-side, and for a new installment purchase also creates the
 * plan + schedule so the returned amount is just the first installment.
 */
export async function resolvePurchase(params: {
  userId: string;
  courseId?: string;
  tier?: "start" | "standard" | "pro";
  subscriptionPlan?: "monthly" | "yearly";
  installmentsCount?: 2 | 3;
  /** Paying a specific already-scheduled installment instead of starting a new purchase. */
  installmentPaymentId?: string;
}): Promise<{ amount: number; installmentPaymentId: string | null } | null> {
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

    return { amount: installment.amount, installmentPaymentId: installment.id };
  }

  if (params.subscriptionPlan) {
    const amount = SUBSCRIPTION_PRICE[params.subscriptionPlan] ?? null;
    return amount === null ? null : { amount, installmentPaymentId: null };
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

    if (params.installmentsCount) {
      const { firstInstallmentId, firstInstallmentAmount } = await createInstallmentPlan({
        userId: params.userId,
        courseId: params.courseId,
        tier: params.tier,
        totalAmount,
        installmentsCount: params.installmentsCount,
      });
      return { amount: firstInstallmentAmount, installmentPaymentId: firstInstallmentId };
    }

    return { amount: totalAmount, installmentPaymentId: null };
  }

  return null;
}
