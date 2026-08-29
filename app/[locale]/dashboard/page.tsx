import { redirect } from "next/navigation";
import { getTranslations, getLocale } from "next-intl/server";
import Image from "next/image";
import { Link } from "@/i18n/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { createClient } from "@/lib/supabase/server";
import { localizedField } from "@/lib/courses";
import type { Locale } from "@/i18n/routing";
import { formatSom, formatDate } from "@/lib/utils";
import { PayInstallmentButton } from "@/components/course/pay-installment-button";
import { DownsellBanner } from "@/components/profile/downsell-banner";
import { ExpiryPopup } from "@/components/profile/expiry-popup";
import { AlertTriangle, Flame, Award, ImageOff, BookOpen, TrendingUp, Sparkles } from "lucide-react";

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
    .select("full_name, current_streak")
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
    .select("course_id, tier")
    .eq("user_id", user.id);
  const purchasedTierByCourse = new Map((enrollments ?? []).map((e) => [e.course_id, e.tier]));

  // A subscription grants "start" access to every published course without
  // an enrollment row per course — so subscribers must see the full catalog
  // here (marked "start"), not "no courses yet", or their dashboard would
  // look broken despite paying for it. A course they *also* bought outright
  // shows its purchased tier instead, since that's the better access they
  // hold for it.
  const { data: subscriberCourses } = subscription
    ? await supabase
        .from("courses")
        .select("id")
        .eq("is_published", true)
        .order("order_index", { ascending: true })
    : { data: null };

  const courseAccess: { courseId: string; accessLevel: "start" | "standard" | "pro" }[] =
    subscription
      ? (subscriberCourses ?? []).map((c) => ({
          courseId: c.id,
          accessLevel: purchasedTierByCourse.get(c.id) ?? "start",
        }))
      : [...purchasedTierByCourse.entries()].map(([courseId, tier]) => ({
          courseId,
          accessLevel: tier,
        }));

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

  const avgProgress = courseIds.length
    ? Math.round(courseIds.reduce((sum, id) => sum + progressFor(id), 0) / courseIds.length)
    : 0;

  return (
    <div className="mx-auto max-w-5xl px-4 py-16">
      {daysUntilExpiry !== null && daysUntilExpiry <= 3 && (
        <ExpiryPopup daysLeft={daysUntilExpiry} />
      )}

      <div className="animate-fade-up flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-3xl font-bold text-white">
            {profile?.full_name ? `${t("dashboard.title")}, ${profile.full_name.split(" ")[0]}` : t("dashboard.title")}
          </h1>
          <p className="mt-1 text-slate-400">{t("dashboard.subtitle")}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {!!profile?.current_streak && (
            <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-500/30 bg-amber-500/10 px-3 py-1.5 text-sm text-amber-400">
              <Flame className="h-3.5 w-3.5" />
              {t("dashboard.streak", { count: profile.current_streak })}
            </span>
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

      {courseAccess.length > 0 && (
        <div
          className="animate-fade-up mt-8 grid grid-cols-3 gap-3 sm:gap-4"
          style={{ animationDelay: "60ms" }}
        >
          <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-500/10">
              <BookOpen className="h-4 w-4 text-amber-500" />
            </span>
            <p className="mt-3 font-mono text-xl font-semibold text-white sm:text-2xl">
              {courseAccess.length}
            </p>
            <p className="mt-0.5 text-xs text-slate-500">{t("dashboard.statCourses")}</p>
          </div>
          <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/10">
              <TrendingUp className="h-4 w-4 text-emerald-500" />
            </span>
            <p className="mt-3 font-mono text-xl font-semibold text-white sm:text-2xl">
              {avgProgress}%
            </p>
            <p className="mt-0.5 text-xs text-slate-500">{t("dashboard.statAvgProgress")}</p>
          </div>
          <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-500/10">
              <Flame className="h-4 w-4 text-amber-500" />
            </span>
            <p className="mt-3 font-mono text-xl font-semibold text-white sm:text-2xl">
              {profile?.current_streak ?? 0}
            </p>
            <p className="mt-0.5 text-xs text-slate-500">{t("dashboard.streakLabel")}</p>
          </div>
        </div>
      )}

      {subscription && <DownsellBanner />}

      {!courseAccess.length ? (
        <div className="animate-fade-up mt-16 flex flex-col items-center gap-4 rounded-2xl border border-dashed border-slate-800 bg-slate-900/30 px-6 py-16 text-center">
          <span className="flex h-14 w-14 items-center justify-center rounded-full bg-amber-500/10">
            <BookOpen className="h-6 w-6 text-amber-500" />
          </span>
          <p className="text-slate-400">{t("dashboard.noCourses")}</p>
          <Button asChild>
            <Link href="/courses">{t("dashboard.browseCourses")}</Link>
          </Button>
        </div>
      ) : (
        <div className="mt-6 grid gap-6 sm:grid-cols-2">
          {courseAccess.map(({ courseId, accessLevel }, i) => {
            const course = courseById.get(courseId);
            if (!course) return null;
            const pct = progressFor(courseId);
            const nextInstallment = nextInstallmentFor(courseId);
            const overdue = nextInstallment && new Date(nextInstallment.due_date) < new Date();
            return (
              <div
                key={courseId}
                className="card-lift animate-fade-up overflow-hidden rounded-xl border border-slate-800 bg-slate-900/60 hover:border-amber-500/40"
                style={{ animationDelay: `${100 + i * 60}ms` }}
              >
                <div className="relative aspect-[21/9] w-full overflow-hidden bg-slate-800">
                  {course.cover_url ? (
                    <Image
                      src={course.cover_url}
                      alt=""
                      fill
                      sizes="(min-width: 640px) 50vw, 100vw"
                      className="object-cover"
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center">
                      <ImageOff className="h-6 w-6 text-slate-600" />
                    </div>
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-slate-950/10 to-transparent" />
                  <div className="absolute inset-x-0 bottom-0 flex items-center justify-between p-4">
                    <span className="line-clamp-1 font-semibold text-white">
                      {localizedField(course, "title", locale)}
                    </span>
                    <Badge variant={accessLevel === "start" ? "outline" : "default"}>
                      {t(`course.tier${accessLevel.charAt(0).toUpperCase()}${accessLevel.slice(1)}`)}
                    </Badge>
                  </div>
                </div>

                <div className="space-y-3 p-5">
                  <div className="flex items-center justify-between text-sm text-slate-400">
                    <span>{t("dashboard.progress")}</span>
                    <span className="font-mono text-white">{pct}%</span>
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
                        {t("course.upgradeTierTitle")}
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
                </div>
              </div>
            );
          })}
        </div>
      )}

      {hasCompletedACourse && suggestedCourse && (
        <div className="animate-fade-up mt-10 flex flex-col gap-4 rounded-xl border border-amber-500/30 bg-amber-500/5 p-6 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-amber-500/15">
              <Sparkles className="h-5 w-5 text-amber-500" />
            </span>
            <div>
              <h2 className="text-lg font-semibold text-white">{t("dashboard.upsellTitle")}</h2>
              <p className="mt-1 text-sm text-slate-400">{t("dashboard.upsellDesc")}</p>
              <p className="mt-2 text-slate-200">{localizedField(suggestedCourse, "title", locale)}</p>
            </div>
          </div>
          <Button asChild size="sm" className="shrink-0">
            <Link href={`/courses/${suggestedCourse.slug}`}>{t("dashboard.browseMore")}</Link>
          </Button>
        </div>
      )}
    </div>
  );
}
