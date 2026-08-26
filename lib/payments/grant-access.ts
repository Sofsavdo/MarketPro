import { createAdminClient } from "@/lib/supabase/server";
import { markInstallmentPaid } from "@/lib/payments/installments";

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
    await supabase.from("enrollments").upsert(
      {
        user_id: payment.user_id,
        course_id: payment.course_id,
        source: "purchase",
      },
      { onConflict: "user_id,course_id" },
    );
  }
}
