"use server";

import { createClient, createAdminClient } from "@/lib/supabase/server";

// Reward tiers mirrored from comparable Uzbek platforms' referral programs:
// invite N friends → get M months of Premium subscription, free.
const REFERRAL_REWARD_TIERS: { count: number; months: number }[] = [
  { count: 10, months: 1 },
  { count: 50, months: 6 },
  { count: 100, months: 12 },
];

// Referral programs convert far better when both sides get something, not
// just the referrer — a week of free "start" access gives the friend an
// immediate reason to actually finish signing up instead of bookmarking the
// link for later.
const NEW_FRIEND_TRIAL_DAYS = 7;

export interface ReferralStats {
  code: string | null;
  count: number;
  nextTier: { count: number; months: number } | null;
}

export async function getMyReferralStats(): Promise<ReferralStats> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { code: null, count: 0, nextTier: REFERRAL_REWARD_TIERS[0] };

  const { data: profile } = await supabase
    .from("profiles")
    .select("referral_code")
    .eq("id", user.id)
    .maybeSingle();

  const { count } = await supabase
    .from("referrals")
    .select("id", { count: "exact", head: true })
    .eq("referrer_id", user.id);

  const referralCount = count ?? 0;
  const nextTier = REFERRAL_REWARD_TIERS.find((tier) => tier.count > referralCount) ?? null;

  return { code: profile?.referral_code ?? null, count: referralCount, nextTier };
}

/**
 * Called once, right after a new account finishes signing up with a
 * `?ref=CODE` link. Records the referral and grants the referrer any reward
 * tier their new total crosses. Uses the admin client throughout — the
 * referral_code → referrer lookup and the reward grant both need to reach
 * data the new user's own RLS session can't see.
 */
export async function redeemReferral(referralCode: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user || !referralCode) return;

  const admin = await createAdminClient();

  const { data: referrer } = await admin
    .from("profiles")
    .select("id")
    .eq("referral_code", referralCode)
    .maybeSingle();

  if (!referrer || referrer.id === user.id) return;

  const { error: insertError } = await admin
    .from("referrals")
    .insert({ referrer_id: referrer.id, referred_id: user.id });

  // unique(referred_id) — already redeemed, or this user is somehow already
  // someone's referral. Either way, nothing further to do.
  if (insertError) return;

  await admin.from("profiles").update({ referred_by: referrer.id }).eq("id", user.id);

  await admin.from("subscriptions").insert({
    user_id: user.id,
    status: "active",
    plan: "monthly",
    current_period_end: new Date(
      Date.now() + NEW_FRIEND_TRIAL_DAYS * 24 * 60 * 60 * 1000,
    ).toISOString(),
  });

  await grantReferralRewards(referrer.id);
}

/**
 * Grants every reward tier the referrer has reached but not yet been given
 * credit for — not just the one their count exactly equals. Two friends'
 * signups landing at nearly the same moment (each reads the count fresh
 * after its own insert) can otherwise make the count jump straight past a
 * threshold like 10 without either call ever seeing count === 10, silently
 * skipping that reward forever; tracking the highest tier already granted
 * (profiles.referral_reward_tier) and comparing with `<=` instead catches
 * up on anything crossed since the last check, and is safe to call
 * repeatedly (a tier already granted is simply a no-op).
 */
async function grantReferralRewards(referrerId: string) {
  const admin = await createAdminClient();

  const { count } = await admin
    .from("referrals")
    .select("id", { count: "exact", head: true })
    .eq("referrer_id", referrerId);
  const referralCount = count ?? 0;

  const { data: profile } = await admin
    .from("profiles")
    .select("referral_reward_tier")
    .eq("id", referrerId)
    .maybeSingle();
  const grantedTier = profile?.referral_reward_tier ?? 0;

  const newlyReachedTiers = REFERRAL_REWARD_TIERS.filter(
    (t) => t.count > grantedTier && t.count <= referralCount,
  );
  if (!newlyReachedTiers.length) return;

  const totalMonths = newlyReachedTiers.reduce((sum, t) => sum + t.months, 0);
  const highestTierReached = newlyReachedTiers[newlyReachedTiers.length - 1].count;

  const { data: existing } = await admin
    .from("subscriptions")
    .select("current_period_end")
    .eq("user_id", referrerId)
    .eq("status", "active")
    .gt("current_period_end", new Date().toISOString())
    .order("current_period_end", { ascending: false })
    .maybeSingle();

  const base = existing ? new Date(existing.current_period_end) : new Date();
  const extended = new Date(base.getTime() + totalMonths * 30 * 24 * 60 * 60 * 1000);

  await admin.from("subscriptions").insert({
    user_id: referrerId,
    status: "active",
    plan: "monthly",
    current_period_end: extended.toISOString(),
  });

  await admin
    .from("profiles")
    .update({ referral_reward_tier: highestTierReached })
    .eq("id", referrerId);
}
