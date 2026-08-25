import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import {
  verifyClickSignature,
  ClickError,
  type ClickWebhookBody,
} from "@/lib/payments/click";
import { grantAccessForPayment } from "@/lib/payments/grant-access";

// Click calls this endpoint twice per transaction: once with `action=0`
// (Prepare) and once with `action=1` (Complete), as x-www-form-urlencoded.
// See https://docs.click.uz/en/click-api-request/
export async function POST(request: NextRequest) {
  const form = await request.formData();
  const body = Object.fromEntries(form.entries()) as unknown as ClickWebhookBody;

  if (!verifyClickSignature(body)) {
    return NextResponse.json({ error: ClickError.SIGN_CHECK_FAILED, error_note: "Invalid sign" });
  }

  const admin = await createAdminClient();
  const { data: payment } = await admin
    .from("payments")
    .select("*")
    .eq("id", body.merchant_trans_id)
    .maybeSingle();

  if (!payment) {
    return NextResponse.json({
      error: ClickError.TRANSACTION_NOT_FOUND,
      error_note: "Payment not found",
    });
  }

  if (Number(body.amount) !== payment.amount) {
    return NextResponse.json({
      error: ClickError.INVALID_AMOUNT,
      error_note: "Amount mismatch",
    });
  }

  const isPrepare = body.action === "0";

  if (isPrepare) {
    return NextResponse.json({
      click_trans_id: body.click_trans_id,
      merchant_trans_id: body.merchant_trans_id,
      merchant_prepare_id: payment.id,
      error: ClickError.SUCCESS,
      error_note: "Success",
    });
  }

  if (payment.status === "paid") {
    return NextResponse.json({
      click_trans_id: body.click_trans_id,
      merchant_trans_id: body.merchant_trans_id,
      error: ClickError.ALREADY_PAID,
      error_note: "Already paid",
    });
  }

  await admin
    .from("payments")
    .update({ status: "paid", provider_transaction_id: body.click_trans_id })
    .eq("id", payment.id);

  await grantAccessForPayment(payment.id);

  return NextResponse.json({
    click_trans_id: body.click_trans_id,
    merchant_trans_id: body.merchant_trans_id,
    merchant_confirm_id: payment.id,
    error: ClickError.SUCCESS,
    error_note: "Success",
  });
}
