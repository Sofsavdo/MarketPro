import { createAdminClient } from "@/lib/supabase/server";
import { SUBSCRIPTION_PRICE } from "@/lib/pricing";
import { createInstallmentPlan } from "@/lib/payments/installments";

/**
 * The client only tells us *what* the user wants to buy (a course, or a
 * subscription plan) — never trust the amount it sends, since a tampered
 * request could otherwise pay any price it likes. This resolves the real
 * price server-side, and for a new installment purchase also creates the
 * plan + schedule so the returned amount is just the first installment.
 */
export async function resolvePurchase(params: {
  userId: string;
  courseId?: string;
  subscriptionPlan?: "monthly" | "yearly";
  installmentsCount?: 2 | 3;
  /** Paying a specific already-scheduled installment instead of starting a new purchase. */
  installmentPaymentId?: string;
  /** A code the buyer typed at checkout — only applies to a fresh course/subscription purchase, not an installment or an already-scheduled payment. */
  promoCode?: string;
}): Promise<{
  amount: number;
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
      installmentPaymentId: installment.id,
      promoCode: null,
      discountAmount: 0,
    };
  }

  // Only applies to a full one-time payment (course or subscription) — not
  // an installment plan, since discounting one installment but not the rest
  // would make the plan's schedule inconsistent with its stated total.
  const promo = params.promoCode && !params.installmentsCount
    ? await resolvePromoCode(admin, params.promoCode)
    : null;

  if (params.subscriptionPlan) {
    const amount = SUBSCRIPTION_PRICE[params.subscriptionPlan] ?? null;
    if (amount === null) return null;
    const discountAmount = promo ? Math.round((amount * promo.discount_percent) / 100) : 0;
    return {
      amount: amount - discountAmount,
      installmentPaymentId: null,
      promoCode: promo?.code ?? null,
      discountAmount,
    };
  }

  if (params.courseId) {
    const { data: course } = await admin
      .from("courses")
      .select("price, is_published")
      .eq("id", params.courseId)
      .maybeSingle();

    if (!course || !course.is_published) return null;

    const totalAmount = course.price;

    if (params.installmentsCount) {
      const { firstInstallmentId, firstInstallmentAmount } = await createInstallmentPlan({
        userId: params.userId,
        courseId: params.courseId,
        totalAmount,
        installmentsCount: params.installmentsCount,
      });
      return {
        amount: firstInstallmentAmount,
        installmentPaymentId: firstInstallmentId,
        promoCode: null,
        discountAmount: 0,
      };
    }

    const discountAmount = promo ? Math.round((totalAmount * promo.discount_percent) / 100) : 0;
    return {
      amount: totalAmount - discountAmount,
      installmentPaymentId: null,
      promoCode: promo?.code ?? null,
      discountAmount,
    };
  }

  return null;
}

async function resolvePromoCode(admin: Awaited<ReturnType<typeof createAdminClient>>, code: string) {
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
