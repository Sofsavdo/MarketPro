import { getTranslations, getLocale } from "next-intl/server";
import Image from "next/image";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { ShieldCheck, Sparkles, Layers, Languages, ArrowRight, ImageOff } from "lucide-react";
import { getPublishedCourses, localizedField } from "@/lib/courses";
import { formatSom } from "@/lib/utils";
import type { Locale } from "@/i18n/routing";
import { InstructorBadge } from "@/components/course/instructor-badge";

// Public, identical for every visitor — cache it instead of hitting
// Supabase on every request. 5 minutes is plenty fresh for a course catalog
// that changes a handful of times a week from the admin panel.
export const revalidate = 300;

export default async function HomePage() {
  const t = await getTranslations();
  const locale = (await getLocale()) as Locale;
  const courses = await getPublishedCourses();

  const features = [
    { icon: Sparkles, title: t("home.features.f1Title"), desc: t("home.features.f1Desc") },
    { icon: Layers, title: t("home.features.f2Title"), desc: t("home.features.f2Desc") },
    { icon: ShieldCheck, title: t("home.features.f3Title"), desc: t("home.features.f3Desc") },
    { icon: Languages, title: t("home.features.f4Title"), desc: t("home.features.f4Desc") },
  ];

  const faqKeys = ["q1", "q2", "q3", "q4", "q5"] as const;

  return (
    <div>
      {/* Hero */}
      <section className="relative overflow-hidden border-b border-slate-800/60">
        <div
          className="pointer-events-none absolute inset-0 opacity-30"
          style={{
            background:
              "radial-gradient(600px circle at 20% 0%, rgba(245,158,11,0.15), transparent 60%), radial-gradient(500px circle at 90% 20%, rgba(245,158,11,0.1), transparent 60%)",
          }}
        />
        <div className="relative mx-auto max-w-6xl px-4 py-24 text-center sm:py-32">
          <Badge variant="outline" className="mb-6">
            {t("home.hero.eyebrow")}
          </Badge>
          <h1 className="text-balance text-4xl font-bold tracking-tight text-white sm:text-6xl">
            {t("home.hero.title")}
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-balance text-lg text-slate-400">
            {t("home.hero.subtitle")}
          </p>
          <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Button asChild size="lg">
              <Link href="/courses">
                {t("home.hero.ctaPrimary")} <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <Link href="/pricing">{t("home.hero.ctaSecondary")}</Link>
            </Button>
          </div>

          <div className="mx-auto mt-16 grid max-w-3xl grid-cols-3 gap-6 border-t border-slate-800/60 pt-10">
            {(["stat1", "stat2", "stat3"] as const).map((key) => (
              <div key={key}>
                <p className="text-2xl font-bold text-amber-500 sm:text-3xl">
                  {t(`home.hero.${key}Value`)}
                </p>
                <p className="mt-1 text-xs text-slate-500 sm:text-sm">
                  {t(`home.hero.${key}Label`)}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="mx-auto max-w-6xl px-4 py-20">
        <h2 className="text-center text-3xl font-bold text-white">{t("home.features.title")}</h2>
        <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {features.map((f) => (
            <Card key={f.title}>
              <CardHeader>
                <f.icon className="h-8 w-8 text-amber-500" />
                <CardTitle className="mt-2 text-base">{f.title}</CardTitle>
                <CardDescription>{f.desc}</CardDescription>
              </CardHeader>
            </Card>
          ))}
        </div>
      </section>

      {/* Courses grid */}
      <section className="border-y border-slate-800/60 bg-slate-900/30 py-20">
        <div className="mx-auto max-w-6xl px-4">
          <div className="flex flex-col items-center gap-2 text-center">
            <h2 className="text-3xl font-bold text-white">{t("home.coursesSection.title")}</h2>
            <p className="max-w-xl text-slate-400">{t("home.coursesSection.subtitle")}</p>
          </div>

          {!courses.length && (
            <p className="mt-12 text-center text-slate-500">{t("home.coursesSection.empty")}</p>
          )}

          <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {courses.map((course, i) => (
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
                        ? i === 1
                          ? t("home.coursesSection.badgePopular")
                          : t("home.coursesSection.badgeNew")
                        : t("home.coursesSection.badgeComingSoon")}
                    </Badge>
                    <span className="text-xs text-slate-500">
                      {course.duration_months} {t("home.coursesSection.months")}
                    </span>
                  </div>
                  <CardTitle className="mt-3">
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
                  <p className="text-sm text-slate-400">
                    {t("home.coursesSection.from")}{" "}
                    <span className="font-semibold text-white">
                      {formatSom(course.price, locale)}
                    </span>
                  </p>
                  <Button asChild size="sm" variant={course.is_published ? "default" : "outline"}>
                    <Link href={`/courses/${course.slug}`}>
                      {t("home.coursesSection.viewCourse")}
                    </Link>
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="mt-10 flex justify-center">
            <Button asChild variant="outline" size="lg">
              <Link href="/courses">{t("home.coursesSection.viewAll")}</Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Pricing teaser */}
      <section className="mx-auto max-w-4xl px-4 py-20 text-center">
        <h2 className="text-3xl font-bold text-white">{t("home.pricingTeaser.title")}</h2>
        <p className="mx-auto mt-3 max-w-xl text-slate-400">{t("home.pricingTeaser.subtitle")}</p>
        <Button asChild size="lg" className="mt-8">
          <Link href="/pricing">{t("home.pricingTeaser.cta")}</Link>
        </Button>
      </section>

      {/* Guarantee */}
      <section className="border-y border-slate-800/60 bg-gradient-to-b from-amber-500/10 to-transparent py-20">
        <div className="mx-auto flex max-w-4xl flex-col items-center gap-4 px-4 text-center">
          <ShieldCheck className="h-10 w-10 text-amber-500" />
          <h2 className="text-3xl font-bold text-white">{t("home.guarantee.title")}</h2>
          <p className="max-w-2xl text-slate-400">{t("home.guarantee.desc")}</p>
        </div>
      </section>

      {/* FAQ */}
      <section className="mx-auto max-w-3xl px-4 py-20">
        <h2 className="text-center text-3xl font-bold text-white">{t("home.faq.title")}</h2>
        <Accordion type="single" collapsible className="mt-10">
          {faqKeys.map((key) => (
            <AccordionItem key={key} value={key}>
              <AccordionTrigger>{t(`home.faq.${key}`)}</AccordionTrigger>
              <AccordionContent>{t(`home.faq.a${key.slice(1)}`)}</AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </section>
    </div>
  );
}
