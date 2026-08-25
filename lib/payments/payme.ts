const PAYME_CHECKOUT_BASE_URL = "https://checkout.paycom.uz";

export function buildPaymeCheckoutUrl(params: { orderId: string; amount: number }) {
  const merchantId = process.env.PAYME_MERCHANT_ID!;
  // Payme amounts are in tiyin (1 so'm = 100 tiyin).
  const raw = `m=${merchantId};ac.order_id=${params.orderId};a=${params.amount * 100}`;
  const encoded = Buffer.from(raw).toString("base64");
  return `${PAYME_CHECKOUT_BASE_URL}/${encoded}`;
}

// Payme JSON-RPC error codes — see https://developer.help.paycom.uz
export const PaymeError = {
  INVALID_AMOUNT: -31001,
  TRANSACTION_NOT_FOUND: -31003,
  UNABLE_TO_PERFORM: -31008,
  ORDER_NOT_FOUND: -31050,
  ALREADY_PAID: -31051,
} as const;

/**
 * Verifies the `Authorization: Basic base64(Paycom:KEY)` header Payme
 * attaches to every JSON-RPC webhook call.
 */
export function verifyPaymeAuth(authorizationHeader: string | null) {
  if (!authorizationHeader?.startsWith("Basic ")) return false;
  const decoded = Buffer.from(authorizationHeader.slice(6), "base64").toString("utf-8");
  const [login, key] = decoded.split(":");
  return login === "Paycom" && key === process.env.PAYME_SECRET_KEY;
}

export interface PaymeRpcRequest {
  method: string;
  params: Record<string, unknown>;
  id: number | string;
}
