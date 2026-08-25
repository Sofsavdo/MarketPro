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

export default async function DashboardPage() {
  const t = await getTranslations();
  const locale = (await getLocale()) as Locale;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

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

  const courseIds = (enrollments ?? []).map((e) => e.course_id);

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

  return (
    <div className="mx-auto max-w-5xl px-4 py-16">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-3xl font-bold text-white">{t("dashboard.title")}</h1>
          <p className="mt-1 text-slate-400">{t("dashboard.subtitle")}</p>
        </div>
        <Badge variant={subscription ? "default" : "outline"}>
          {subscription ? t("dashboard.subscriptionActive") : t("dashboard.subscriptionNone")}
        </Badge>
      </div>

      {!enrollments?.length ? (
        <div className="mt-16 flex flex-col items-center gap-4 text-center">
          <p className="text-slate-400">{t("dashboard.noCourses")}</p>
          <Button asChild>
            <Link href="/courses">{t("dashboard.browseCourses")}</Link>
          </Button>
        </div>
      ) : (
        <div className="mt-10 grid gap-6 sm:grid-cols-2">
          {enrollments.map((enrollment) => {
            const course = courseById.get(enrollment.course_id);
            if (!course) return null;
            const pct = progressFor(enrollment.course_id);
            return (
              <Card key={enrollment.course_id}>
                <CardHeader>
                  <CardTitle>{localizedField(course, "title", locale)}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 pt-0">
                  <div className="flex items-center justify-between text-sm text-slate-400">
                    <span>{t("dashboard.progress")}</span>
                    <span>{pct}%</span>
                  </div>
                  <Progress value={pct} />
                  <Button asChild variant="outline" className="w-full">
                    <Link href={`/courses/${course.slug}`}>
                      {pct > 0 ? t("course.continueLesson") : t("course.startLesson")}
                    </Link>
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
