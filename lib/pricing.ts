// Subscription pricing — grants "start" access (video + community, no live,
// no mentor) to every published course. VIP (lifetime, full) access to one
// specific course is bought separately at that course's own `price` — see
// the access-model note on the `courses` table in supabase/schema.sql.
export const SUBSCRIPTION_PRICE = {
  monthly: 999_000,
  yearly: 9_990_000, // 10 months' worth — 2 months free
} as const;
