// Subscription pricing — unlocks every course. One-off course prices live
// on each row in `courses` (price_start/price_standard/price_pro).
export const SUBSCRIPTION_PRICE = {
  monthly: 990_000,
  yearly: 9_900_000, // ~10 months' worth — 2 months free
} as const;
