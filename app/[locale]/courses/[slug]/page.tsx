import { notFound } from "next/navigation";
import { getTranslations, getLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Lock, PlayCircle } from "lucide-react";
import { getCourseBySlug, getCourseModulesWithLessons, localizedField } from "@/lib/courses";
import { getLessonAccess, isLessonLocked } from "@/lib/lms/access";
import { createClient } from "@/lib/supabase/server";
import { formatSom, cn } from "@/lib/utils";
import type { Locale } from "@/i18n/routing";
import { PurchaseButtons } from "@/components/course/purchase-buttons";
import { WaitlistForm } from "@/components/course/waitlist-form";
import { InstructorBadge } from "@/components/course/instructor-badge";

export default async function CourseDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const t = await getTranslations();
  const locale = (await getLocale()) as Locale;
  const course = await getCourseBySlug(slug);
  if (!course) notFound();

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const modules = course.is_published ? await getCourseModulesWithLessons(course.id) : [];
  const access = await getLessonAccess(user?.id ?? null, course.id);

  const allLessons = modules.flatMap((m) => m.lessons);
  const lockStates = await Promise.all(
    allLessons.map((l) => isLessonLocked(user?.id ?? null, course.id, l.order_index)),
  );
  const lockMap = new Map(allLessons.map((l, i) => [l.id, lockStates[i]]));

  return (
    <div className="mx-auto max-w-5xl px-4 py-16">
      <Badge variant={course.is_published ? "default" : "outline"}>
        {course.is_published
          ? t("home.coursesSection.badgePopular")
          : t("home.coursesSection.badgeComingSoon")}
      </Badge>
      <h1 className="mt-4 text-3xl font-bold text-white sm:text-4xl">
        {localizedField(course, "title", locale)}
      </h1>
      <p className="mt-3 max-w-2xl text-slate-400">
        {localizedField(course, "description", locale)}
      </p>

      {course.instructor_name && (
        <div className="mt-3">
          <InstructorBadge
            name={course.instructor_name}
            avatarUrl={course.instructor_avatar_url}
            label={t("course.instructorLabel")}
          />
        </div>
      )}

      {course.is_published && (
        <div className="mt-6 flex flex-wrap gap-4 text-sm text-slate-400">
          <span>
            {t("course.duration")}: {course.duration_months} {t("home.coursesSection.months")}
          </span>
          <span>
            {modules.length} {t("course.modules")} · {allLessons.length} {t("course.lessons")}
          </span>
        </div>
      )}

      {!course.is_published ? (
        <div className="mt-8 max-w-xl rounded-2xl border border-slate-800 bg-slate-900/40 p-6">
          <h2 className="text-lg font-semibold text-white">{t("course.waitlistTitle")}</h2>
          <p className="mt-1 text-sm text-slate-400">{t("course.waitlistDesc")}</p>
          <div className="mt-4">
            <WaitlistForm courseId={course.id} />
          </div>
        </div>
      ) : (
        access.accessLevel !== "vip" && (
          <Card className="mt-8 max-w-md border-amber-500/40">
            <CardHeader>
              <CardTitle className="text-base">
                {access.accessLevel === "start" ? t("course.upgradeToVipTitle") : t("course.vipTitle")}
              </CardTitle>
              <p className="text-sm text-slate-400">{t("course.vipIncludes")}</p>
              <p className="text-2xl font-bold text-amber-500">{formatSom(course.price, locale)}</p>
            </CardHeader>
            <CardContent className="pt-0">
              {user ? (
                <PurchaseButtons courseId={course.id} />
              ) : (
                <Button asChild className="w-full">
                  <Link href="/login">{t("course.loginToBuy")}</Link>
                </Button>
              )}
            </CardContent>
          </Card>
        )
      )}

      {course.is_published && (
        <>
          <h2 className="mt-14 text-2xl font-bold text-white">{t("course.curriculum")}</h2>
          <div className="mt-6 space-y-6">
            {modules.map((mod, mi) => (
              <div key={mod.id}>
                <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
                  {mi + 1}. {localizedField(mod, "title", locale)}
                </h3>
                <div className="mt-3 space-y-2">
                  {mod.lessons.map((lesson) => {
                    const locked = access.hasCourseAccess
                      ? lockMap.get(lesson.id)
                      : !lesson.is_free_preview;
                    return (
                      <Link
                        key={lesson.id}
                        href={locked ? "#" : `/courses/${course.slug}/lessons/${lesson.id}`}
                        className={cn(
                          "flex items-center justify-between rounded-lg border border-slate-800 bg-slate-900/40 px-4 py-3 text-sm transition-colors",
                          locked ? "cursor-not-allowed opacity-60" : "hover:border-amber-500/50",
                        )}
                      >
                        <span className="flex items-center gap-3 text-slate-200">
                          {locked ? (
                            <Lock className="h-4 w-4 text-slate-500" />
                          ) : (
                            <PlayCircle className="h-4 w-4 text-amber-500" />
                          )}
                          {localizedField(lesson, "title", locale)}
                        </span>
                        {lesson.is_free_preview && (
                          <Badge variant="outline">{t("course.freePreview")}</Badge>
                        )}
                      </Link>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
