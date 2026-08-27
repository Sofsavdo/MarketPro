import { getTranslations, getLocale } from "next-intl/server";
import Image from "next/image";
import { ImageOff } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
      <h1 className="text-3xl font-bold text-white sm:text-4xl">{t("home.coursesSection.title")}</h1>
      <p className="mt-2 text-slate-400">{t("home.coursesSection.subtitle")}</p>

      {!courses.length && (
        <p className="mt-16 text-center text-slate-500">{t("home.coursesSection.empty")}</p>
      )}

      <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {courses.map((course) => (
          <Card key={course.id} className="flex flex-col justify-between overflow-hidden">
            <div className="relative aspect-video w-full bg-slate-800">
              {course.cover_url ? (
                <Image
                  src={course.cover_url}
                  alt=""
                  fill
                  sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
                  className="object-cover"
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
              <CardTitle className="mt-3">{localizedField(course, "title", locale)}</CardTitle>
              <CardDescription>{localizedField(course, "description", locale)}</CardDescription>
              {course.instructor_name && (
                <InstructorBadge
                  name={course.instructor_name}
                  avatarUrl={course.instructor_avatar_url}
                  label={t("course.instructorLabel")}
                />
              )}
            </CardHeader>
            <CardContent className="flex items-center justify-between pt-0">
              <div className="text-sm text-slate-400">
                <p className="font-semibold text-white">{formatSom(course.price, locale)}</p>
                <p className="text-xs">
                  {t("course.orMonthly", {
                    amount: formatSom(computeMonthlyInstallment(course.price), locale),
                  })}
                </p>
              </div>
              <Button asChild size="sm" variant={course.is_published ? "default" : "outline"}>
                <Link href={`/courses/${course.slug}`}>{t("home.coursesSection.viewCourse")}</Link>
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
