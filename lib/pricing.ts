// Subscription pricing — grants "start" access (video + community, no live,
// no mentor) to every published course. VIP (lifetime, full) access to one
// specific course is bought separately at that course's own `price` — see
// the access-model note on the `courses` table in supabase/schema.sql.
export const SUBSCRIPTION_PRICE = {
  monthly: 999_000,
  yearly: 9_990_000, // 10 months' worth — 2 months free
} as const;

/**
 * A VIP course purchase can be paid two ways: full price up front (Click/
 * Payme/Atmos, instant access), or a 12-month installment plan an operator
 * formalizes by phone after the student registers interest (see
 * lib/lms/installment-lead-actions.ts) — no self-serve online 2/3-part
 * split anymore, that confused students about what they were agreeing to.
 * The installment path costs more in total (financing risk + operator
 * time), priced as a flat 43% markup spread evenly over 12 months.
 */
export const INSTALLMENT_MULTIPLIER = 1.43;
export const INSTALLMENT_MONTHS = 12;

export function computeMonthlyInstallment(coursePrice: number): number {
  return Math.round((coursePrice * INSTALLMENT_MULTIPLIER) / INSTALLMENT_MONTHS);
}
