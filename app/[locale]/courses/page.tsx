import { getTranslations, getLocale } from "next-intl/server";
import Image from "next/image";
import { ArrowRight, ImageOff } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getPublishedCourses, localizedField } from "@/lib/courses";
import { formatSom } from "@/lib/utils";
import { computeMonthlyInstallment } from "@/lib/pricing";
import type { Locale } from "@/i18n/routing";
import { InstructorBadge } from "@/components/course/instructor-badge";

// Same reasoning as the homepage — public catalog data, safe to cache.
export const revalidate = 300;

export default async function CoursesPage() {
  const t = await getTranslations();
  const locale = (await getLocale()) as Locale;
  const courses = await getPublishedCourses();

  return (
    <div className="mx-auto max-w-6xl px-4 py-16">
      <div className="animate-fade-up">
        <h1 className="text-3xl font-bold text-white sm:text-4xl">{t("home.coursesSection.title")}</h1>
        <p className="mt-2 text-slate-400">{t("home.coursesSection.subtitle")}</p>
      </div>

      {!courses.length && (
        <p className="mt-16 text-center text-slate-500">{t("home.coursesSection.empty")}</p>
      )}

      <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {courses.map((course) => (
          <Link key={course.id} href={`/courses/${course.slug}`} className="group block">
            <Card className="card-lift flex h-full flex-col justify-between overflow-hidden hover:border-amber-500/40">
              <div className="relative aspect-video w-full overflow-hidden bg-slate-800">
                {course.cover_url ? (
                  <Image
                    src={course.cover_url}
                    alt=""
                    fill
                    sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
                    className="object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                ) : (
                  <div className="flex h-full items-center justify-center">
                    <ImageOff className="h-8 w-8 text-slate-600" />
                  </div>
                )}
              </div>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <Badge variant={course.is_published ? "default" : "outline"}>
                    {course.is_published
                      ? t("home.coursesSection.badgePopular")
                      : t("home.coursesSection.badgeComingSoon")}
                  </Badge>
                  <span className="text-xs text-slate-500">
                    {course.duration_months} {t("home.coursesSection.months")}
                  </span>
                </div>
                <CardTitle className="mt-3 line-clamp-1 transition-colors group-hover:text-amber-400">
                  {localizedField(course, "title", locale)}
                </CardTitle>
                <CardDescription className="line-clamp-2">
                  {localizedField(course, "description", locale)}
                </CardDescription>
                {course.instructor_name && (
                  <InstructorBadge
                    name={course.instructor_name}
                    avatarUrl={course.instructor_avatar_url}
                    label={t("course.instructorLabel")}
                  />
                )}
              </CardHeader>
              <CardContent className="flex items-center justify-between pt-0">
                <div>
                  {course.price_start > 0 && (
                    <>
                      <p className="text-sm text-slate-400">
                        {t("home.coursesSection.from")} {formatSom(course.price_start, locale)}
                      </p>
                      <p className="text-base font-semibold text-amber-400">
                        {t("course.orMonthly", {
                          amount: formatSom(computeMonthlyInstallment(course.price_start), locale),
                        })}
                      </p>
                    </>
                  )}
                </div>
                <span className="inline-flex items-center gap-1 text-sm font-medium text-amber-400">
                  {t("home.coursesSection.viewCourse")}
                  <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
                </span>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
