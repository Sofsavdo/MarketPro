"use server";

import { createClient, createAdminClient } from "@/lib/supabase/server";
import { resolvePromoCode } from "@/lib/payments/resolve-amount";

/**
 * Live preview for the "Faollashtirish" button in the purchase dialog — lets
 * a student see the discounted price before checkout instead of only
 * finding out at Click/Payme. Read-only: never increments used_count (that
 * only happens once a payment actually succeeds, in grant-access.ts) and
 * never itself decides what gets charged — resolvePurchase re-validates the
 * code server-side at checkout regardless of what this returned, so a
 * tampered client can't turn a preview into a real discount.
 */
export async function validatePromoCode(
  courseId: string,
  tier: "start" | "standard" | "pro",
  code: string,
): Promise<{ valid: boolean; discountPercent?: number; discountedAmount?: number }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { valid: false };

  const trimmed = code.trim();
  if (!trimmed) return { valid: false };

  const admin = await createAdminClient();

  const { data: course } = await admin
    .from("courses")
    .select("price_start, price_standard, price_pro, is_published")
    .eq("id", courseId)
    .maybeSingle();
  if (!course || !course.is_published) return { valid: false };

  const priceByTier = {
    start: course.price_start,
    standard: course.price_standard,
    pro: course.price_pro,
  } as const;
  const price = priceByTier[tier];
  if (!Number.isFinite(price) || price <= 0) return { valid: false };

  const promo = await resolvePromoCode(admin, trimmed);
  if (!promo) return { valid: false };

  const discountAmount = Math.round((price * promo.discount_percent) / 100);
  return {
    valid: true,
    discountPercent: promo.discount_percent,
    discountedAmount: price - discountAmount,
  };
}
