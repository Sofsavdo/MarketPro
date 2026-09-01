import type { Metadata } from "next";
import { getTranslations, getLocale } from "next-intl/server";
import Image from "next/image";
import { ArrowRight, ImageOff } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { getPublishedCourses, localizedField } from "@/lib/courses";
import { formatSom } from "@/lib/utils";
import { computeMonthlyInstallment } from "@/lib/pricing";
import { routing } from "@/i18n/routing";
import type { Locale } from "@/i18n/routing";

// Same reasoning as the homepage — public catalog data, safe to cache.
export const revalidate = 300;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "seo" });
  return {
    title: t("coursesTitle"),
    description: t("coursesDescription"),
    keywords: t("coursesKeywords"),
    alternates: {
      canonical: `/${locale}/courses`,
      languages: Object.fromEntries(routing.locales.map((l) => [l, `/${l}/courses`])),
    },
    openGraph: { title: t("coursesTitle"), description: t("coursesDescription"), type: "website" },
  };
}

/*
 * Light landing treatment, matching the home page's course carousel card
 * design (see components/home/course-carousel.tsx and app/[locale]/page.tsx)
 * — this catalog is just as much a marketing/conversion page as the home
 * page, so it gets the same bespoke light markup instead of the dark
 * Card/Badge-outline primitives (see the home page's own comment on why).
 *
 * The old version showed every course with a "Mashhur" (Popular) badge —
 * getPublishedCourses() only returns published courses, so that condition
 * was always true and the badge was meaningless noise, not real data.
 * Dropped it. The price block used to stack a small "full price" line above
 * a bold monthly-price line of a visibly different weight/size, reading as
 * uneven rather than as one coherent price — now it's a single line, same
 * treatment as the home page's cards.
 */
export default async function CoursesPage() {
  const t = await getTranslations();
  const locale = (await getLocale()) as Locale;
  const courses = await getPublishedCourses();

  return (
    <div className="bg-amber-50 text-slate-950">
      <div className="mx-auto max-w-6xl px-4 py-16">
        <div className="animate-fade-up">
          <h1 className="text-3xl font-bold text-slate-950 sm:text-4xl">
            {t("home.coursesSection.title")}
          </h1>
          <p className="mt-2 text-slate-600">{t("home.coursesSection.subtitle")}</p>
        </div>

        {!courses.length && (
          <p className="mt-16 text-center text-slate-500">{t("home.coursesSection.empty")}</p>
        )}

        <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {courses.map((course) => (
            <Link
              key={course.id}
              href={`/courses/${course.slug}`}
              className="group block overflow-hidden rounded-2xl border border-amber-200 bg-white transition-all duration-300 hover:-translate-y-1.5 hover:border-amber-400 hover:shadow-xl hover:shadow-amber-900/10"
            >
              <div className="relative aspect-video w-full overflow-hidden bg-amber-50">
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
                    <ImageOff className="h-8 w-8 text-amber-300" />
                  </div>
                )}
              </div>
              <div className="p-5">
                <div className="flex items-center justify-between text-xs text-slate-500">
                  <span className="font-mono">
                    {course.duration_months} {t("home.coursesSection.months")}
                  </span>
                </div>
                <h3 className="mt-2 line-clamp-1 font-semibold text-slate-950 transition-colors group-hover:text-amber-700">
                  {localizedField(course, "title", locale)}
                </h3>
                <p className="mt-1.5 line-clamp-2 text-sm text-slate-600">
                  {localizedField(course, "description", locale)}
                </p>
                {course.instructor_name && (
                  <p className="mt-2 text-xs text-slate-500">
                    {t("course.instructorLabel")}: {course.instructor_name}
                  </p>
                )}
                <div className="mt-4 flex items-center justify-between border-t border-amber-100 pt-4">
                  <div>
                    {course.price_start > 0 && (
                      <p className="text-sm font-semibold text-amber-800">
                        {t("course.orMonthly", {
                          amount: formatSom(computeMonthlyInstallment(course.price_start), locale),
                        })}
                      </p>
                    )}
                  </div>
                  <span className="flex h-8 w-8 items-center justify-center rounded-full border border-slate-200 text-slate-500 transition-all group-hover:rotate-45 group-hover:border-amber-500 group-hover:bg-amber-500 group-hover:text-slate-950">
                    <ArrowRight className="h-3.5 w-3.5" />
                  </span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
