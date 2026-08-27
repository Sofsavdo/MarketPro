import { createAdminClient } from "@/lib/supabase/server";
import { markInstallmentPaid } from "@/lib/payments/installments";
import { reportSofsavdoConversion, SOFSAVDO_COMMISSION_RATE } from "@/lib/payments/sofsavdo-integration";

/**
 * Called from the Click/Payme webhook handlers once a payment is confirmed
 * `paid`. Activates the course (one-time purchase) or subscription (all
 * courses) the payment record was created for. Uses the service-role
 * client because webhooks arrive without a user session cookie.
 */
export async function grantAccessForPayment(paymentId: string) {
  const supabase = await createAdminClient();

  const { data: payment } = await supabase
    .from("payments")
    .select("*")
    .eq("id", paymentId)
    .single();

  if (!payment || payment.status !== "paid") return;

  if (payment.promo_code) {
    // Best-effort increment, not a strict atomic counter — a promo code is
    // an admin-issued convenience limit, not a security boundary, so a rare
    // race under heavy concurrent redemption isn't worth a DB function for.
    const { data: promo } = await supabase
      .from("promo_codes")
      .select("used_count")
      .eq("code", payment.promo_code)
      .maybeSingle();
    if (promo) {
      await supabase
        .from("promo_codes")
        .update({ used_count: promo.used_count + 1 })
        .eq("code", payment.promo_code);
    }
  }

  if (payment.installment_payment_id) {
    await markInstallmentPaid(payment.installment_payment_id);
  }

  if (payment.subscription_plan) {
    const periodDays = payment.subscription_plan === "yearly" ? 365 : 30;
    const currentPeriodEnd = new Date(Date.now() + periodDays * 24 * 60 * 60 * 1000);

    await supabase.from("subscriptions").insert({
      user_id: payment.user_id,
      status: "active",
      plan: payment.subscription_plan,
      current_period_end: currentPeriodEnd.toISOString(),
    });
    return;
  }

  if (payment.course_id) {
    // A user can already hold a lower tier on this course (e.g. bought
    // Start, later upgrades to Pro) — upsert must never downgrade what
    // they already have, so take the higher of the two ranks.
    const TIER_RANK = { start: 0, standard: 1, pro: 2 } as const;
    const { data: existing } = await supabase
      .from("enrollments")
      .select("tier")
      .eq("user_id", payment.user_id)
      .eq("course_id", payment.course_id)
      .maybeSingle();

    const newTier = payment.tier ?? "start";
    const tier =
      existing && TIER_RANK[existing.tier] > TIER_RANK[newTier] ? existing.tier : newTier;

    await supabase.from("enrollments").upsert(
      {
        user_id: payment.user_id,
        course_id: payment.course_id,
        source: "purchase",
        tier,
      },
      { onConflict: "user_id,course_id" },
    );

    const courseId = payment.course_id;
    const referralClickToken = payment.referral_click_token;
    if (referralClickToken) {
      // Deliberately NOT awaited: this function runs inside grantAccessForPayment, which the
      // Click/Payme webhook route handlers await directly before sending their HTTP response —
      // Click and Payme both expect that response quickly, so blocking it on an outbound network
      // call to Sofsavdo (which can take up to reportSofsavdoConversion's own 10s timeout) risks
      // delaying or failing a payment provider's webhook over a side effect that has nothing to
      // do with whether the payment itself succeeded. Safe to fire-and-forget like this because
      // this process is a long-running Railway service, not a serverless function that freezes at
      // response time — the promise keeps running after this request returns. Every failure mode
      // (the course lookup, the report call itself) is caught here so nothing here can ever
      // surface as an unhandled rejection.
      void (async () => {
        try {
          const { data: course } = await supabase
            .from("courses")
            .select("title_uz")
            .eq("id", courseId)
            .maybeSingle();

          await reportSofsavdoConversion({
            clickToken: referralClickToken,
            externalPaymentId: payment.id,
            amountSom: payment.amount,
            commissionSom: Math.round(payment.amount * SOFSAVDO_COMMISSION_RATE),
            planName: course?.title_uz ?? "Izdosh kursi",
          });
        } catch (err) {
          console.error(`Sofsavdo conversion report failed for payment ${payment.id}:`, err);
        }
      })();
    }
  }
}

/**
 * The refund counterpart to grantAccessForPayment — undoes whatever a paid
 * payment granted. Shared by the admin's manual "Qaytarish" button and by
 * Payme's CancelTransaction webhook (a real refund/chargeback initiated
 * from Payme's side, not just an admin decision), so a refund issued either
 * way actually revokes access instead of only flipping the payment's status
 * while the student keeps what they paid for.
 */
export async function revokeAccessForPayment(paymentId: string) {
  const supabase = await createAdminClient();

  const { data: payment } = await supabase.from("payments").select("*").eq("id", paymentId).single();
  if (!payment) return;

  if (payment.course_id) {
    await supabase
      .from("enrollments")
      .delete()
      .eq("user_id", payment.user_id)
      .eq("course_id", payment.course_id);
  }

  if (payment.subscription_plan) {
    await supabase
      .from("subscriptions")
      .update({ status: "canceled" })
      .eq("user_id", payment.user_id)
      .eq("status", "active");
  }
}
