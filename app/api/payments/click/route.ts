import { NextRequest, NextResponse } from "next/server";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { buildClickCheckoutUrl } from "@/lib/payments/click";
import { resolvePurchase } from "@/lib/payments/resolve-amount";
import { SOFSAVDO_REF_COOKIE } from "@/lib/constants";

// POST /api/payments/click — called by the buy button to start a checkout.
// The Click callback (Prepare/Complete) lives separately at
// /api/payments/click/webhook, since Click always POSTs there too.
export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { courseId, tier, subscriptionPlan, installmentPaymentId, promoCode, termsAccepted } = body as {
    courseId?: string;
    tier?: "start" | "standard" | "pro";
    subscriptionPlan?: "monthly" | "yearly";
    installmentPaymentId?: string;
    promoCode?: string;
    termsAccepted?: boolean;
  };

  // A scheduled installment payment (installmentPaymentId) was already
  // consented to when the plan itself was set up — only a new course or
  // subscription purchase needs a fresh checkbox.
  if ((courseId || subscriptionPlan) && !termsAccepted) {
    return NextResponse.json({ error: "terms_not_accepted" }, { status: 400 });
  }

  const resolved = await resolvePurchase({
    userId: user.id,
    courseId,
    tier,
    subscriptionPlan,
    installmentPaymentId,
    promoCode,
  });
  if (resolved === null) {
    return NextResponse.json({ error: "invalid_purchase" }, { status: 400 });
  }

  // Only a course purchase can be attributed to a Sofsavdo blogger — each
  // Sofsavdo "Product" maps to one Izdosh course, so a subscription (which
  // spans every course) doesn't have a single Product to credit.
  const referralClickToken = courseId
    ? (request.cookies.get(SOFSAVDO_REF_COOKIE)?.value ?? null)
    : null;

  const admin = await createAdminClient();
  const { data: payment, error } = await admin
    .from("payments")
    .insert({
      user_id: user.id,
      provider: "click",
      amount: resolved.amount,
      discount_amount: resolved.discountAmount,
      status: "pending",
      course_id: courseId ?? null,
      tier: resolved.tier,
      subscription_plan: subscriptionPlan ?? null,
      installment_payment_id: resolved.installmentPaymentId,
      promo_code: resolved.promoCode,
      referral_click_token: referralClickToken,
      terms_accepted_at: termsAccepted ? new Date().toISOString() : null,
    })
    .select("id")
    .single();

  if (error || !payment) {
    return NextResponse.json({ error: "could_not_create_payment" }, { status: 500 });
  }

  const checkoutUrl = buildClickCheckoutUrl({
    orderId: payment.id,
    amount: resolved.amount,
    returnUrl: `${process.env.NEXT_PUBLIC_SITE_URL}/dashboard`,
  });

  return NextResponse.json({ checkoutUrl });
}
