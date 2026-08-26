import { redirect } from "next/navigation";
import { getTranslations, getLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { createClient } from "@/lib/supabase/server";
import { localizedField } from "@/lib/courses";
import type { Locale } from "@/i18n/routing";
import { formatSom, formatDate } from "@/lib/utils";
import { PayInstallmentButton } from "@/components/course/pay-installment-button";
import { DownsellBanner } from "@/components/profile/downsell-banner";
import { ExpiryPopup } from "@/components/profile/expiry-popup";
import { AlertTriangle, Flame, Award } from "lucide-react";

export default async function DashboardPage() {
  const t = await getTranslations();
  const locale = (await getLocale()) as Locale;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("current_streak")
    .eq("id", user.id)
    .maybeSingle();

  const { data: subscription } = await supabase
    .from("subscriptions")
    .select("status, current_period_end")
    .eq("user_id", user.id)
    .eq("status", "active")
    .gt("current_period_end", new Date().toISOString())
    .maybeSingle();

  const { data: enrollments } = await supabase
    .from("enrollments")
    .select("course_id")
    .eq("user_id", user.id);
  const vipCourseIds = new Set((enrollments ?? []).map((e) => e.course_id));

  // A subscription grants "start" access to every published course without
  // an enrollment row per course — so subscribers must see the full catalog
  // here (marked "start"), not "no courses yet", or their dashboard would
  // look broken despite paying for it. A course they *also* bought outright
  // shows as VIP instead, since that's the better access they hold for it.
  const { data: subscriberCourses } = subscription
    ? await supabase
        .from("courses")
        .select("id")
        .eq("is_published", true)
        .order("order_index", { ascending: true })
    : { data: null };

  const courseAccess: { courseId: string; accessLevel: "start" | "vip" }[] = subscription
    ? (subscriberCourses ?? []).map((c) => ({
        courseId: c.id,
        accessLevel: vipCourseIds.has(c.id) ? ("vip" as const) : ("start" as const),
      }))
    : [...vipCourseIds].map((courseId) => ({ courseId, accessLevel: "vip" as const }));

  const courseIds = courseAccess.map((c) => c.courseId);

  const { data: enrolledCourses } = courseIds.length
    ? await supabase.from("courses").select("*").in("id", courseIds)
    : { data: [] };
  const courseById = new Map((enrolledCourses ?? []).map((c) => [c.id, c]));

  const { data: progressRows } = courseIds.length
    ? await supabase.from("user_progress").select("course_id, completed").in("course_id", courseIds)
    : { data: [] };

  const { data: allLessons } = courseIds.length
    ? await supabase.from("lessons").select("id, course_id").in("course_id", courseIds)
    : { data: [] };

  function progressFor(courseId: string) {
    const total = (allLessons ?? []).filter((l) => l.course_id === courseId).length;
    const done = (progressRows ?? []).filter(
      (p) => p.course_id === courseId && p.completed,
    ).length;
    return total > 0 ? Math.round((done / total) * 100) : 0;
  }

  const { data: plans } = await supabase
    .from("installment_plans")
    .select("id, course_id")
    .eq("user_id", user.id);

  const { data: pendingInstallments } = plans?.length
    ? await supabase
        .from("installment_payments")
        .select("*")
        .in(
          "plan_id",
          plans.map((p) => p.id),
        )
        .eq("status", "pending")
        .order("due_date", { ascending: true })
    : { data: [] };

  function nextInstallmentFor(courseId: string) {
    const plan = (plans ?? []).find((p) => p.course_id === courseId);
    if (!plan) return null;
    return (pendingInstallments ?? []).find((ip) => ip.plan_id === plan.id) ?? null;
  }

  const hasCompletedACourse = courseIds.some((id) => progressFor(id) >= 100);
  const { data: suggestedCourse } = hasCompletedACourse
    ? await supabase
        .from("courses")
        .select("slug, title_uz, title_ru, title_en")
        .eq("is_published", true)
        .not("id", "in", `(${courseIds.length ? courseIds.join(",") : "00000000-0000-0000-0000-000000000000"})`)
        .order("order_index", { ascending: true })
        .limit(1)
        .maybeSingle()
    : { data: null };

  const daysUntilExpiry = subscription
    ? Math.ceil(
        (new Date(subscription.current_period_end).getTime() - new Date().getTime()) /
          (24 * 60 * 60 * 1000),
      )
    : null;

  return (
    <div className="mx-auto max-w-5xl px-4 py-16">
      {daysUntilExpiry !== null && daysUntilExpiry <= 3 && (
        <ExpiryPopup daysLeft={daysUntilExpiry} />
      )}

      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-3xl font-bold text-white">{t("dashboard.title")}</h1>
          <p className="mt-1 text-slate-400">{t("dashboard.subtitle")}</p>
        </div>
        <div className="flex items-center gap-3">
          {!!profile?.current_streak && (
            <Badge variant="outline" className="gap-1">
              <Flame className="h-3.5 w-3.5 text-amber-500" />
              {t("dashboard.streak", { count: profile.current_streak })}
            </Badge>
          )}
          <Badge variant={subscription ? "default" : "outline"}>
            {subscription ? t("dashboard.subscriptionActive") : t("dashboard.subscriptionNone")}
          </Badge>
          <Button asChild variant="outline" size="sm">
            <Link href="/live">{t("nav.live")}</Link>
          </Button>
          <Button asChild variant="outline" size="sm">
            <Link href="/profile">{t("dashboard.profile")}</Link>
          </Button>
        </div>
      </div>

      {subscription && <DownsellBanner />}

      {!courseAccess.length ? (
        <div className="mt-16 flex flex-col items-center gap-4 text-center">
          <p className="text-slate-400">{t("dashboard.noCourses")}</p>
          <Button asChild>
            <Link href="/courses">{t("dashboard.browseCourses")}</Link>
          </Button>
        </div>
      ) : (
        <div className="mt-10 grid gap-6 sm:grid-cols-2">
          {courseAccess.map(({ courseId, accessLevel }) => {
            const course = courseById.get(courseId);
            if (!course) return null;
            const pct = progressFor(courseId);
            const nextInstallment = nextInstallmentFor(courseId);
            const overdue = nextInstallment && new Date(nextInstallment.due_date) < new Date();
            return (
              <Card key={courseId}>
                <CardHeader>
                  <div className="flex items-center justify-between gap-2">
                    <CardTitle>{localizedField(course, "title", locale)}</CardTitle>
                    <Badge variant={accessLevel === "vip" ? "default" : "outline"}>
                      {accessLevel === "vip" ? "VIP" : t("dashboard.accessStart")}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3 pt-0">
                  <div className="flex items-center justify-between text-sm text-slate-400">
                    <span>{t("dashboard.progress")}</span>
                    <span>{pct}%</span>
                  </div>
                  <Progress value={pct} />

                  {nextInstallment && (
                    <div
                      className={`rounded-lg border p-3 text-sm ${
                        overdue
                          ? "border-red-500/40 bg-red-500/5"
                          : "border-slate-800 bg-slate-900/40"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className={overdue ? "flex items-center gap-1.5 text-red-400" : "text-slate-300"}>
                          {overdue && <AlertTriangle className="h-4 w-4" />}
                          {t("dashboard.nextInstallment")}: {formatSom(nextInstallment.amount, locale)}
                        </span>
                        <span className="text-xs text-slate-500">
                          {formatDate(nextInstallment.due_date, locale)}
                        </span>
                      </div>
                      <div className="mt-2">
                        <PayInstallmentButton installmentPaymentId={nextInstallment.id} />
                      </div>
                    </div>
                  )}

                  {accessLevel === "start" && (
                    <p className="rounded-lg border border-dashed border-slate-800 p-2 text-center text-xs text-slate-500">
                      {t("dashboard.startAccessNote")}{" "}
                      <Link href={`/courses/${course.slug}`} className="text-amber-400 hover:underline">
                        {t("course.upgradeToVipTitle")}
                      </Link>
                    </p>
                  )}

                  <Button asChild variant="outline" className="w-full">
                    <Link href={`/courses/${course.slug}`}>
                      {pct >= 100
                        ? t("course.completed")
                        : pct > 0
                          ? t("course.continueLesson")
                          : t("course.startLesson")}
                    </Link>
                  </Button>

                  {pct >= 100 && (
                    <Button asChild variant="outline" className="w-full gap-1.5">
                      <a href={`/api/certificates/${courseId}?locale=${locale}`}>
                        <Award className="h-4 w-4 text-amber-500" />
                        {t("course.downloadCertificate")}
                      </a>
                    </Button>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {hasCompletedACourse && suggestedCourse && (
          <div className="mt-10 rounded-lg border border-amber-500/30 bg-amber-500/5 p-6">
            <h2 className="text-lg font-semibold text-white">{t("dashboard.upsellTitle")}</h2>
            <p className="mt-1 text-sm text-slate-400">{t("dashboard.upsellDesc")}</p>
            <div className="mt-4 flex items-center justify-between gap-3">
              <span className="text-slate-200">
                {localizedField(suggestedCourse, "title", locale)}
              </span>
              <Button asChild size="sm">
                <Link href={`/courses/${suggestedCourse.slug}`}>{t("dashboard.browseMore")}</Link>
              </Button>
            </div>
          </div>
        )}
    </div>
  );
}
