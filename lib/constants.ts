/**
 * Where the downsell banner and expiry popup send a subscriber who wants to
 * talk to a sales operator about upgrading to a VIP course. Replace with
 * the real operator handle before launch.
 */
export const OPERATOR_TELEGRAM_URL = "https://t.me/izdosh_operator";

/**
 * Cookie name for a Sofsavdo blogger-referral click token (set in proxy.ts
 * from a `?ref=` query param, read back in the Click/Payme checkout routes).
 * See lib/payments/sofsavdo-integration.ts for the full flow.
 */
export const SOFSAVDO_REF_COOKIE = "sf_ref";
