import crypto from "crypto";

const CLICK_BASE_URL = "https://my.click.uz/services/pay";

export function buildClickCheckoutUrl(params: {
  orderId: string;
  amount: number;
  returnUrl: string;
}) {
  const serviceId = process.env.CLICK_SERVICE_ID!;
  const merchantId = process.env.CLICK_MERCHANT_ID!;

  const url = new URL(CLICK_BASE_URL);
  url.searchParams.set("service_id", serviceId);
  url.searchParams.set("merchant_id", merchantId);
  url.searchParams.set("amount", params.amount.toString());
  url.searchParams.set("transaction_param", params.orderId);
  url.searchParams.set("return_url", params.returnUrl);
  return url.toString();
}

// Click error codes — see https://docs.click.uz
export const ClickError = {
  SUCCESS: 0,
  SIGN_CHECK_FAILED: -1,
  INVALID_AMOUNT: -2,
  ACTION_NOT_FOUND: -3,
  ALREADY_PAID: -4,
  USER_NOT_FOUND: -5,
  TRANSACTION_NOT_FOUND: -6,
  FAILED_TO_UPDATE: -7,
  ERROR_IN_REQUEST: -8,
  TRANSACTION_CANCELLED: -9,
} as const;

export interface ClickWebhookBody {
  click_trans_id: string;
  service_id: string;
  click_paydoc_id: string;
  merchant_trans_id: string;
  merchant_prepare_id?: string;
  amount: string;
  action: string; // "0" = Prepare, "1" = Complete
  error: string;
  error_note: string;
  sign_time: string;
  sign_string: string;
}

/**
 * Verifies the MD5 signature Click attaches to every Prepare/Complete
 * webhook call, per https://docs.click.uz/en/click-api-request/#sign-string.
 */
export function verifyClickSignature(body: ClickWebhookBody) {
  const secret = process.env.CLICK_SECRET_KEY!;
  const isComplete = body.action === "1";

  const raw = isComplete
    ? `${body.click_trans_id}${body.service_id}${secret}${body.merchant_trans_id}${body.merchant_prepare_id}${body.amount}${body.action}${body.sign_time}`
    : `${body.click_trans_id}${body.service_id}${secret}${body.merchant_trans_id}${body.amount}${body.action}${body.sign_time}`;

  const expected = crypto.createHash("md5").update(raw).digest("hex");
  return expected === body.sign_string;
}
