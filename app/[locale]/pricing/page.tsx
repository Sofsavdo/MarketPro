import { getTranslations, getLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Check } from "lucide-react";
import { formatSom, cn } from "@/lib/utils";
import { SUBSCRIPTION_PRICE } from "@/lib/pricing";
import { SubscribeButtons } from "@/components/course/subscribe-buttons";
import { createClient } from "@/lib/supabase/server";
import { getPublishedCourses } from "@/lib/courses";
import type { Locale } from "@/i18n/routing";

const TIER_FEATURES: Record<"start" | "standard" | "pro", string[]> = {
  start: ["featVideo", "featMaterials", "featCommunity", "featMentorGroup"],
  standard: ["featVideo", "featMaterials", "featCommunity", "featMentorGroup", "featLive2x"],
  pro: ["featVideo", "featMaterials", "featCommunity", "featMentorGroup", "featLive3x"],
};

export default async function PricingPage() {
  const t = await getTranslations();
  const locale = (await getLocale()) as Locale;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Despite the name, getPublishedCourses() returns every course (including
  // unpublished "coming soon" ones, which the catalog pages also show) — but
  // an unsold, not-yet-priced course must not drag the "starting from"
  // teaser here down to 0, so this is scoped to courses actually on sale.
  const sellableCourses = (await getPublishedCourses()).filter(
    (c) => c.is_published && c.price_start > 0,
  );
  const tierStartingPrice = {
    start: sellableCourses.length ? Math.min(...sellableCourses.map((c) => c.price_start)) : null,
    standard: sellableCourses.length
      ? Math.min(...sellableCourses.map((c) => c.price_standard))
      : null,
    pro: sellableCourses.length ? Math.min(...sellableCourses.map((c) => c.price_pro)) : null,
  };

  return (
    <div className="mx-auto max-w-5xl px-4 py-16">
      <div className="text-center">
        <h1 className="text-3xl font-bold text-white sm:text-4xl">{t("pricing.title")}</h1>
        <p className="mt-2 text-slate-400">{t("pricing.subtitle")}</p>
      </div>

      {/* Subscription — "start" access to every course */}
      <div className="mt-14">
        <div className="flex items-center gap-3">
          <h2 className="text-xl font-semibold text-white">{t("pricing.tabSubscription")}</h2>
          <Badge>{t("pricing.mostPopular")}</Badge>
        </div>

        <Card className="mt-6 border-amber-500/40">
          <CardHeader>
            <CardTitle>{t("pricing.subscriptionTitle")}</CardTitle>
            <CardDescription>{t("pricing.subscriptionDesc")}</CardDescription>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="max-w-xs rounded-xl border border-slate-800 p-5">
              <p className="text-sm text-slate-400">{t("pricing.monthly")}</p>
              <p className="mt-1 text-3xl font-bold text-white">
                {formatSom(SUBSCRIPTION_PRICE.monthly, locale)}
              </p>
              <div className="mt-4">
                <SubscribeButtons plan="monthly" isLoggedIn={!!user} />
              </div>
            </div>
          </CardContent>
        </Card>

        <p className="mt-6 text-center text-sm text-slate-500">{t("pricing.guaranteeNote")}</p>
      </div>

      {/* Three lifetime tariffs — buy one course outright, tiered by how much live/mentor access it includes */}
      <div className="mt-16">
        <h2 className="text-xl font-semibold text-white">{t("pricing.tabCourses")}</h2>
        <p className="mt-1 text-sm text-slate-400">{t("pricing.tiersDesc")}</p>

        <div className="mt-6 grid gap-4 sm:grid-cols-3">
          {(["start", "standard", "pro"] as const).map((tier) => (
            <Card key={tier} className={cn(tier === "standard" && "border-amber-500/40")}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">{t(`course.tier${capitalize(tier)}`)}</CardTitle>
                  {tier === "standard" && <Badge>{t("pricing.mostPopular")}</Badge>}
                </div>
                {tierStartingPrice[tier] !== null && (
                  <p className="text-lg font-bold text-amber-500">
                    {t("home.coursesSection.from")} {formatSom(tierStartingPrice[tier]!, locale)}
                  </p>
                )}
              </CardHeader>
              <CardContent className="pt-0">
                <ul className="space-y-2 text-sm text-slate-300">
                  {TIER_FEATURES[tier].map((feat) => (
                    <li key={feat} className="flex items-start gap-2">
                      <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" />
                      {t(`pricing.${feat}`)}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          ))}
        </div>

        <p className="mt-4 text-center text-sm text-slate-500">
          {t("pricing.tierPickNote")}{" "}
          <Link href="/courses" className="text-amber-400 hover:underline">
            {t("home.coursesSection.viewAll")}
          </Link>
        </p>
      </div>
    </div>
  );
}

function capitalize(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}
