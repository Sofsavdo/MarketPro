import { getTranslations, getLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatSom } from "@/lib/utils";
import { SUBSCRIPTION_PRICE } from "@/lib/pricing";
import { SubscribeButtons } from "@/components/course/subscribe-buttons";
import { createClient } from "@/lib/supabase/server";
import { getPublishedCourses } from "@/lib/courses";
import type { Locale } from "@/i18n/routing";

export default async function PricingPage() {
  const t = await getTranslations();
  const locale = (await getLocale()) as Locale;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const courses = await getPublishedCourses();
  const startingPrice = courses.length ? Math.min(...courses.map((c) => c.price)) : null;

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
          <CardContent className="grid gap-6 pt-0 sm:grid-cols-2">
            <div className="rounded-xl border border-slate-800 p-5">
              <p className="text-sm text-slate-400">{t("pricing.monthly")}</p>
              <p className="mt-1 text-3xl font-bold text-white">
                {formatSom(SUBSCRIPTION_PRICE.monthly, locale)}
              </p>
              <div className="mt-4">
                <SubscribeButtons plan="monthly" isLoggedIn={!!user} />
              </div>
            </div>
            <div className="rounded-xl border border-amber-500/40 p-5">
              <p className="text-sm text-slate-400">
                {t("pricing.yearly")} · <span className="text-amber-400">{t("pricing.yearlyDiscount")}</span>
              </p>
              <p className="mt-1 text-3xl font-bold text-white">
                {formatSom(SUBSCRIPTION_PRICE.yearly, locale)}
              </p>
              <div className="mt-4">
                <SubscribeButtons plan="yearly" isLoggedIn={!!user} />
              </div>
            </div>
          </CardContent>
        </Card>

        <p className="mt-6 text-center text-sm text-slate-500">{t("pricing.guaranteeNote")}</p>
      </div>

      {/* VIP — buy one course outright, lifetime access + live + mentor */}
      <div className="mt-16">
        <h2 className="text-xl font-semibold text-white">{t("pricing.tabCourses")}</h2>
        <Card className="mt-6 max-w-xl">
          <CardHeader>
            <CardTitle className="text-base">{t("pricing.vipTitle")}</CardTitle>
            <CardDescription>{t("pricing.vipDesc")}</CardDescription>
          </CardHeader>
        </Card>
        <p className="mt-3 text-sm text-slate-500">
          {startingPrice !== null && (
            <>
              {t("home.coursesSection.from")}{" "}
              <span className="font-medium text-slate-300">
                {formatSom(startingPrice, locale)}
              </span>{" "}
              ·{" "}
            </>
          )}
          <Link href="/courses" className="text-amber-400 hover:underline">
            {t("home.coursesSection.viewAll")}
          </Link>
        </p>
      </div>
    </div>
  );
}
