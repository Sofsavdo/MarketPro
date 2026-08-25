import { NextRequest, NextResponse } from "next/server";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { buildPaymeCheckoutUrl } from "@/lib/payments/payme";
import { resolvePaymentAmount } from "@/lib/payments/resolve-amount";

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
  const { courseId, tier, subscriptionPlan } = body as {
    courseId?: string;
    tier?: "start" | "standard" | "pro";
    subscriptionPlan?: "monthly" | "yearly";
  };

  const amount = await resolvePaymentAmount({ courseId, tier, subscriptionPlan });
  if (amount === null) {
    return NextResponse.json({ error: "invalid_purchase" }, { status: 400 });
  }

  const admin = await createAdminClient();
  const { data: payment, error } = await admin
    .from("payments")
    .insert({
      user_id: user.id,
      provider: "payme",
      amount,
      status: "pending",
      course_id: courseId ?? null,
      tier: tier ?? null,
      subscription_plan: subscriptionPlan ?? null,
    })
    .select("id")
    .single();

  if (error || !payment) {
    return NextResponse.json({ error: "could_not_create_payment" }, { status: 500 });
  }

  const checkoutUrl = buildPaymeCheckoutUrl({ orderId: payment.id, amount });
  return NextResponse.json({ checkoutUrl });
}
