import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations, getLocale } from "next-intl/server";
import Image from "next/image";
import { Link } from "@/i18n/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Lock, PlayCircle, Clock, Layers, BookOpen, ShoppingBag } from "lucide-react";
import { getCourseBySlug, getCourseModulesWithLessons, localizedField } from "@/lib/courses";
import { getLessonAccess, isLessonLocked, isFreePreview } from "@/lib/lms/access";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { formatSom, cn } from "@/lib/utils";
import { routing } from "@/i18n/routing";
import type { Locale } from "@/i18n/routing";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://izdosh.uz";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const locale = (await getLocale()) as Locale;
  const course = await getCourseBySlug(slug);
  if (!course) return {};

  const title = localizedField(course, "title", locale);
  const description = localizedField(course, "description", locale);

  return {
    title,
    description,
    alternates: {
      canonical: `/${locale}/courses/${slug}`,
      languages: Object.fromEntries(routing.locales.map((l) => [l, `/${l}/courses/${slug}`])),
    },
    openGraph: {
      title,
      description,
      type: "website",
      images: course.cover_url ? [course.cover_url] : undefined,
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: course.cover_url ? [course.cover_url] : undefined,
    },
  };
}

/**
 * Course structured data (schema.org/Course) — gives search engines and AI
 * crawlers clean, unambiguous facts about the course (provider, price,
 * language) instead of having to infer them from page copy, and makes the
 * page eligible for Google's Course rich result.
 */
function CourseJsonLd({
  course,
  locale,
  slug,
}: {
  course: NonNullable<Awaited<ReturnType<typeof getCourseBySlug>>>;
  locale: Locale;
  slug: string;
}) {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Course",
    name: localizedField(course, "title", locale),
    description: localizedField(course, "description", locale),
    url: `${siteUrl}/${locale}/courses/${slug}`,
    image: course.cover_url ?? undefined,
    provider: {
      "@type": "EducationalOrganization",
      name: "IZDOSH Academy",
      sameAs: siteUrl,
    },
    ...(course.price_start > 0 && {
      offers: {
        "@type": "Offer",
        price: course.price_start,
        priceCurrency: "UZS",
        url: `${siteUrl}/${locale}/courses/${slug}`,
        availability: course.is_published
          ? "https://schema.org/InStock"
          : "https://schema.org/PreOrder",
      },
    }),
  };
  return (
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
  );
}
import { PurchaseButtons } from "@/components/course/purchase-buttons";
import { WaitlistForm } from "@/components/course/waitlist-form";
import { InstructorBadge } from "@/components/course/instructor-badge";
import { CourseReviews } from "@/components/course/course-reviews";
import { submitCourseReview } from "@/lib/lms/reviews-actions";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

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

  // RLS already limits this to approved reviews plus the caller's own
  // (possibly still-pending) one — see course_reviews' select policy.
  const { data: reviewRows } = course.is_published
    ? await supabase
        .from("course_reviews")
        .select("id, rating, comment, status, created_at, user_id")
        .eq("course_id", course.id)
        .order("created_at", { ascending: false })
    : { data: [] };
  // Reviews are public, so displaying the reviewer's name needs the
  // service-role client — RLS on `profiles` only lets a session read its
  // own row, and full_name isn't sensitive enough to warrant a broader
  // public SELECT policy on the whole table.
  const reviewerIds = [...new Set((reviewRows ?? []).map((r) => r.user_id))];
  const reviewerAdmin = reviewerIds.length ? await createAdminClient() : null;
  const { data: reviewerProfiles } = reviewerAdmin
    ? await reviewerAdmin.from("profiles").select("id, full_name").in("id", reviewerIds)
    : { data: [] };
  const reviewerNameById = new Map((reviewerProfiles ?? []).map((p) => [p.id, p.full_name]));
  const allVisibleReviews = (reviewRows ?? []).map((r) => ({
    ...r,
    full_name: reviewerNameById.get(r.user_id) ?? null,
  }));
  // A still-pending review (only ever the caller's own, per RLS) never
  // counts toward the public list/average — it isn't published yet.
  const reviews = allVisibleReviews.filter((r) => r.status === "approved");
  const averageRating = reviews.length
    ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length
    : null;
  const existingUserReview = user
    ? (allVisibleReviews.find((r) => r.user_id === user.id) ?? null)
    : null;

  // Reviewing requires finishing every lesson, not merely having access —
  // mirrors has_completed_course(), the actual enforcement point (this is
  // only for the UI to decide whether to show the form at all).
  const canReview =
    !!user && allLessons.length > 0
      ? await (async () => {
          const { count } = await supabase
            .from("user_progress")
            .select("id", { count: "exact", head: true })
            .eq("user_id", user.id)
            .eq("completed", true)
            .in(
              "lesson_id",
              allLessons.map((l) => l.id),
            );
          return (count ?? 0) >= allLessons.length;
        })()
      : false;

  return (
    <div className="mx-auto max-w-5xl px-4 py-16">
      <CourseJsonLd course={course} locale={locale} slug={slug} />
      {course.cover_url && (
        <div className="animate-fade-up relative mb-8 aspect-[21/9] w-full overflow-hidden rounded-xl bg-slate-800">
          <Image
            src={course.cover_url}
            alt=""
            fill
            sizes="(min-width: 1024px) 1024px, 100vw"
            priority
            className="object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-slate-950/10 to-transparent" />
        </div>
      )}
      <div className="animate-fade-up" style={{ animationDelay: course.cover_url ? "60ms" : "0ms" }}>
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
          <div className="mt-4">
            <InstructorBadge
              name={course.instructor_name}
              avatarUrl={course.instructor_avatar_url}
              label={t("course.instructorLabel")}
            />
          </div>
        )}

        {course.is_published && (
          <div className="mt-6 flex flex-wrap gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-800 bg-slate-900/60 px-3 py-1.5 text-xs text-slate-300">
              <Clock className="h-3.5 w-3.5 text-amber-500" />
              {course.duration_months} {t("home.coursesSection.months")}
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-800 bg-slate-900/60 px-3 py-1.5 text-xs text-slate-300">
              <Layers className="h-3.5 w-3.5 text-amber-500" />
              {modules.length} {t("course.modules")}
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-800 bg-slate-900/60 px-3 py-1.5 text-xs text-slate-300">
              <BookOpen className="h-3.5 w-3.5 text-amber-500" />
              {allLessons.length} {t("course.lessons")}
            </span>
          </div>
        )}
      </div>

      {!course.is_published ? (
        <div className="animate-fade-up mt-8 max-w-xl rounded-2xl border border-slate-800 bg-slate-900/40 p-6">
          <h2 className="text-lg font-semibold text-white">{t("course.waitlistTitle")}</h2>
          <p className="mt-1 text-sm text-slate-400">{t("course.waitlistDesc")}</p>
          <div className="mt-4">
            <WaitlistForm courseId={course.id} />
          </div>
        </div>
      ) : (
        access.accessLevel !== "pro" && (
          <div
            id="purchase"
            className="animate-fade-up mt-6 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-amber-500/40 bg-amber-500/5 px-5 py-4 scroll-mt-24"
          >
            <div className="flex items-center gap-3">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-amber-500/15">
                <ShoppingBag className="h-4 w-4 text-amber-400" />
              </span>
              <p className="text-sm font-medium text-white">
                {access.accessLevel ? t("course.upgradeTierTitle") : t("course.buyTitle")}
              </p>
            </div>
            <Dialog>
              <DialogTrigger asChild>
                <Button size="sm">
                  {t("course.buyFrom")} {formatSom(course.price_start, locale)}
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>
                    {access.accessLevel ? t("course.upgradeTierTitle") : t("course.buyTitle")}
                  </DialogTitle>
                </DialogHeader>
                <div className="mt-2">
                  <PurchaseButtons
                    courseId={course.id}
                    prices={{
                      start: course.price_start,
                      standard: course.price_standard,
                      pro: course.price_pro,
                    }}
                    locale={locale}
                    isLoggedIn={!!user}
                  />
                </div>
              </DialogContent>
            </Dialog>
          </div>
        )
      )}

      {course.is_published && (
        <>
          <h2 className="mt-14 text-2xl font-bold text-white">{t("course.curriculum")}</h2>
          {/* Collapsed by default, first module open — a 20-30 lesson course
              read as one long flat list is exactly the kind of "tiring"
              scroll this is meant to avoid; a module the student can
              scan/skip past at a glance is much easier to hold in mind. */}
          <Accordion
            type="multiple"
            defaultValue={modules[0] ? [modules[0].id] : []}
            className="mt-6"
          >
            {modules.map((mod, mi) => {
              const unlockedCount = mod.lessons.filter((lesson) =>
                access.hasCourseAccess ? !lockMap.get(lesson.id) : isFreePreview(lesson),
              ).length;
              return (
                <AccordionItem
                  key={mod.id}
                  value={mod.id}
                  className="mb-3 rounded-xl border border-slate-800 bg-slate-900/30 px-4"
                >
                  <AccordionTrigger className="py-4 text-sm">
                    <span className="flex min-w-0 flex-1 items-center gap-3">
                      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-slate-800 text-xs font-semibold text-slate-300">
                        {mi + 1}
                      </span>
                      <span className="min-w-0 flex-1 truncate pr-1 text-left font-semibold text-white">
                        {localizedField(mod, "title", locale)}
                      </span>
                      <span className="shrink-0 text-xs font-normal text-slate-500">
                        <span className="hidden sm:inline">{unlockedCount > 0 && `${unlockedCount}/`}</span>
                        {mod.lessons.length} {t("course.lessons")}
                      </span>
                    </span>
                  </AccordionTrigger>
                  <AccordionContent>
                    <div className="space-y-2">
                      {mod.lessons.map((lesson) => {
                        const locked = access.hasCourseAccess
                          ? lockMap.get(lesson.id)
                          : !isFreePreview(lesson);
                        return (
                          <Link
                            key={lesson.id}
                            href={locked ? "#" : `/courses/${course.slug}/lessons/${lesson.id}`}
                            className={cn(
                              "flex items-center gap-3 rounded-lg border border-slate-800 bg-slate-950/40 px-3 py-2.5 text-sm transition-colors",
                              locked ? "cursor-not-allowed opacity-60" : "hover:border-amber-500/50",
                            )}
                          >
                            <span className="relative flex h-9 w-14 shrink-0 items-center justify-center overflow-hidden rounded-md bg-slate-800 sm:h-11 sm:w-[72px]">
                              {lesson.thumbnail_url ? (
                                <Image
                                  src={lesson.thumbnail_url}
                                  alt=""
                                  fill
                                  sizes="72px"
                                  className="object-cover"
                                />
                              ) : (
                                <PlayCircle className="h-4 w-4 text-slate-600" />
                              )}
                              <span className="absolute bottom-1 right-1 flex h-4 w-4 items-center justify-center rounded-full bg-slate-950/80">
                                {locked ? (
                                  <Lock className="h-2.5 w-2.5 text-slate-400" />
                                ) : (
                                  <PlayCircle className="h-2.5 w-2.5 text-amber-500" />
                                )}
                              </span>
                            </span>
                            <span className="min-w-0 flex-1 truncate text-slate-200">
                              {localizedField(lesson, "title", locale)}
                            </span>
                            {isFreePreview(lesson) && (
                              <Badge variant="outline" className="hidden shrink-0 sm:inline-flex">
                                {t("course.freePreview")}
                              </Badge>
                            )}
                          </Link>
                        );
                      })}
                    </div>
                  </AccordionContent>
                </AccordionItem>
              );
            })}
          </Accordion>

          <CourseReviews
            reviews={reviews}
            average={averageRating}
            canReview={canReview}
            existingReview={
              existingUserReview
                ? { rating: existingUserReview.rating, status: existingUserReview.status }
                : null
            }
            action={submitCourseReview.bind(null, course.id, slug)}
            locale={locale}
          />
        </>
      )}
    </div>
  );
}
