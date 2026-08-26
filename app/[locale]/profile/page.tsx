import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/server";
import { updateProfile } from "@/lib/lms/profile-actions";
import { getMyReferralStats } from "@/lib/lms/referral-actions";
import { ReferralCard } from "@/components/profile/referral-card";

export default async function ProfilePage() {
  const t = await getTranslations("auth");
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .maybeSingle();

  const referralStats = await getMyReferralStats();

  return (
    <div className="mx-auto max-w-md px-4 py-16">
      <Card>
        <CardHeader>
          <CardTitle>{profile?.full_name || profile?.phone || user.phone}</CardTitle>
        </CardHeader>
        <CardContent>
          <form action={updateProfile} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="full_name">{t("fullName")}</Label>
              <Input id="full_name" name="full_name" defaultValue={profile?.full_name ?? ""} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="phone">{t("phone")}</Label>
              <Input id="phone" value={profile?.phone ?? user.phone ?? ""} disabled />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="address">{t("address")}</Label>
              <Input id="address" name="address" defaultValue={profile?.address ?? ""} />
            </div>
            <Button type="submit" className="mt-2">
              {t("save")}
            </Button>
          </form>
        </CardContent>
      </Card>

      {referralStats.code && (
        <ReferralCard
          code={referralStats.code}
          count={referralStats.count}
          nextTierCount={referralStats.nextTier?.count ?? null}
          nextTierMonths={referralStats.nextTier?.months ?? null}
          siteUrl={process.env.NEXT_PUBLIC_SITE_URL ?? "https://izdosh.uz"}
        />
      )}
    </div>
  );
}
