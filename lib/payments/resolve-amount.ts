import { createAdminClient } from "@/lib/supabase/server";
import { SUBSCRIPTION_PRICE } from "@/lib/pricing";

/**
 * The client only tells us *what* the user wants to buy (course+tier, or a
 * subscription plan) — never trust the amount it sends, since a tampered
 * request could otherwise pay any price it likes. This looks the real price
 * up server-side from the courses table / SUBSCRIPTION_PRICE.
 */
export async function resolvePaymentAmount(params: {
  courseId?: string;
  tier?: "start" | "standard" | "pro";
  subscriptionPlan?: "monthly" | "yearly";
}): Promise<number | null> {
  if (params.subscriptionPlan) {
    return SUBSCRIPTION_PRICE[params.subscriptionPlan] ?? null;
  }

  if (params.courseId && params.tier) {
    const admin = await createAdminClient();
    const { data: course } = await admin
      .from("courses")
      .select("price_start, price_standard, price_pro, is_published")
      .eq("id", params.courseId)
      .maybeSingle();

    if (!course || !course.is_published) return null;

    const priceByTier = {
      start: course.price_start,
      standard: course.price_standard,
      pro: course.price_pro,
    } as const;

    return priceByTier[params.tier];
  }

  return null;
}
