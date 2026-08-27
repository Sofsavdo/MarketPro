import crypto from "crypto";

/**
 * Reports a course-purchase conversion back to Sofsavdo when the buyer
 * arrived via a Sofsavdo blogger's referral link (see proxy.ts capturing
 * `?ref=` into the sf_ref cookie, and grantAccessForPayment — the only
 * caller — reading it off the payment row once it's 'paid').
 *
 * Mirrors Sofsavdo's own src/fidem-integration/fidem-click-token.util.ts and
 * Fidem's sofsavdo_integration.py exactly, byte-for-byte on the signing
 * scheme: HMAC-SHA256 over the same dot-joined field order, truncated to the
 * first 16 hex chars. SOFSAVDO_INTEGRATION_SECRET here must equal
 * IZDOSH_INTEGRATION_SECRET configured on Sofsavdo's side.
 *
 * Fire-and-forget by design, same reasoning as Fidem's Python counterpart —
 * a failure here must never affect a payment that has already succeeded by
 * the time this runs. Errors are swallowed, not thrown.
 */

const SOFSAVDO_WEBHOOK_URL =
  process.env.SOFSAVDO_WEBHOOK_URL ?? "https://api.sofsavdo.com/integrations/izdosh/webhook";

function sign(
  clickToken: string,
  externalPaymentId: string,
  amountMinor: number,
  commissionAmountMinor: number,
  occurredAt: string,
  secret: string,
): string {
  const payload = `${clickToken}.${externalPaymentId}.${amountMinor}.${commissionAmountMinor}.${occurredAt}`;
  return crypto.createHmac("sha256", secret).update(payload).digest("hex").slice(0, 16);
}

/** 5% of the sale price, per the blogger-commission rate agreed with Sofsavdo. */
export const SOFSAVDO_COMMISSION_RATE = 0.05;

/**
 * amountSom/commissionSom are IZDOSH's own so'm amounts (whole-number major
 * units) — converted to Sofsavdo's minor-unit (tiyin) convention here, the
 * one point the two systems' money representations meet.
 */
export async function reportSofsavdoConversion(params: {
  clickToken: string;
  externalPaymentId: string;
  amountSom: number;
  commissionSom: number;
  planName: string;
}): Promise<void> {
  const secret = process.env.SOFSAVDO_INTEGRATION_SECRET;
  if (!secret) {
    // Not configured — silently a no-op rather than an error, same as
    // Fidem's Python side, so a deploy without this env var doesn't break
    // real payments over a feature that isn't live yet.
    return;
  }

  const occurredAt = new Date().toISOString();
  const amountMinor = params.amountSom * 100;
  const commissionAmountMinor = params.commissionSom * 100;
  const signature = sign(
    params.clickToken,
    params.externalPaymentId,
    amountMinor,
    commissionAmountMinor,
    occurredAt,
    secret,
  );

  const body = {
    clickToken: params.clickToken,
    externalPaymentId: params.externalPaymentId,
    amountMinor,
    commissionAmountMinor,
    currency: "UZS",
    occurredAt,
    planName: params.planName,
    signature,
  };

  try {
    const res = await fetch(SOFSAVDO_WEBHOOK_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(10_000),
    });
    if (!res.ok) {
      console.error(
        `Sofsavdo conversion webhook returned ${res.status} for ${params.externalPaymentId}`,
      );
    }
  } catch (err) {
    console.error(`Sofsavdo conversion webhook failed for ${params.externalPaymentId}:`, err);
  }
}
