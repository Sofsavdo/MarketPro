import { NextRequest, NextResponse } from "next/server";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { buildPaymeCheckoutUrl } from "@/lib/payments/payme";
import { resolvePurchase } from "@/lib/payments/resolve-amount";

// POST /api/payments/payme — called by the buy button to start a checkout.
// The Payme JSON-RPC callback lives separately at /api/payments/payme/webhook.
export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { courseId, tier, subscriptionPlan, installmentsCount, installmentPaymentId, promoCode } = body as {
    courseId?: string;
    tier?: "start" | "standard" | "pro";
    subscriptionPlan?: "monthly" | "yearly";
    installmentsCount?: 2 | 3;
    installmentPaymentId?: string;
    promoCode?: string;
  };

  const resolved = await resolvePurchase({
    userId: user.id,
    courseId,
    tier,
    subscriptionPlan,
    installmentsCount,
    installmentPaymentId,
    promoCode,
  });
  if (resolved === null) {
    return NextResponse.json({ error: "invalid_purchase" }, { status: 400 });
  }

  const admin = await createAdminClient();
  const { data: payment, error } = await admin
    .from("payments")
    .insert({
      user_id: user.id,
      provider: "payme",
      amount: resolved.amount,
      discount_amount: resolved.discountAmount,
      status: "pending",
      course_id: courseId ?? null,
      tier: resolved.tier,
      subscription_plan: subscriptionPlan ?? null,
      installment_payment_id: resolved.installmentPaymentId,
      promo_code: resolved.promoCode,
    })
    .select("id")
    .single();

  if (error || !payment) {
    return NextResponse.json({ error: "could_not_create_payment" }, { status: 500 });
  }

  const checkoutUrl = buildPaymeCheckoutUrl({ orderId: payment.id, amount: resolved.amount });
  return NextResponse.json({ checkoutUrl });
}
