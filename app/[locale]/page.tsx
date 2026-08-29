import { getTranslations, getLocale } from "next-intl/server";
import Image from "next/image";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ShieldCheck, Sparkles, Layers, Languages, ArrowRight, ImageOff, Star } from "lucide-react";
import { getPublishedCourses, localizedField } from "@/lib/courses";
import { formatSom } from "@/lib/utils";
import { computeMonthlyInstallment } from "@/lib/pricing";
import type { Locale } from "@/i18n/routing";
import { CourseCarousel } from "@/components/home/course-carousel";

// Public, identical for every visitor — cache it instead of hitting
// Supabase on every request. 5 minutes is plenty fresh for a course catalog
// that changes a handful of times a week from the admin panel.
export const revalidate = 300;

/*
 * The landing page is intentionally light — Brand Book §15's "Light Gold"
 * (amber-100/amber-50) ground instead of the Midnight Blue used everywhere
 * else in the product (dashboard, admin, course player). The distinction is
 * deliberate: a marketing page reads open and inviting, the product itself
 * (below, via Button/Badge default variants and the rest of the app) stays
 * the brand's dark "app" surface. Because of that split, this page avoids
 * the shared Card/Accordion primitives — their brand-book dark styling
 * (Card: Midnight Blue bg, white text) is correct for every other page but
 * would be unreadable here, so course/testimonial cards use bespoke light
 * markup instead. Button/Badge's *default* (solid gold) variant works on
 * any background and is reused as-is; their outline/ghost/secondary
 * variants assume a dark page and are avoided here.
 */
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
  const testimonialItems = t.raw("home.testimonials.items") as {
    quote: string;
    name: string;
    role: string;
  }[];

  const cheapestMonthly = courses
    .filter((c) => c.price_start > 0)
    .reduce<number | null>((min, c) => {
      const monthly = computeMonthlyInstallment(c.price_start);
      return min === null ? monthly : Math.min(min, monthly);
    }, null);

  return (
    <div className="bg-amber-50 text-slate-950">
      {/* Hero */}
      <section className="relative overflow-hidden">
        <div
          className="pointer-events-none absolute inset-0 opacity-70"
          style={{
            background:
              "radial-gradient(560px circle at 12% -10%, rgba(201,162,39,0.22), transparent 60%), radial-gradient(480px circle at 92% 10%, rgba(16,185,129,0.12), transparent 60%)",
          }}
        />
        <div className="relative mx-auto max-w-6xl px-4 py-24 text-center sm:py-32">
          <span className="animate-fade-up inline-flex items-center gap-2 rounded-full bg-amber-500 px-3 py-1 text-xs font-semibold text-slate-950">
            {t("home.hero.eyebrow")}
          </span>
          <h1
            className="animate-fade-up text-balance mt-6 text-4xl font-bold tracking-tight text-slate-950 sm:text-6xl"
            style={{ animationDelay: "60ms" }}
          >
            {t("home.hero.title")}
          </h1>
          <p
            className="animate-fade-up mx-auto mt-6 max-w-2xl text-balance text-lg text-slate-600"
            style={{ animationDelay: "120ms" }}
          >
            {t("home.hero.subtitle")}
          </p>
          <div
            className="animate-fade-up mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row"
            style={{ animationDelay: "180ms" }}
          >
            <Button asChild size="lg">
              <Link href="/courses">
                {t("home.hero.ctaPrimary")} <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
            <Button
              asChild
              size="lg"
              className="border border-slate-300 bg-white text-slate-800 hover:bg-slate-100"
            >
              <Link href="/pricing">{t("home.hero.ctaSecondary")}</Link>
            </Button>
            {cheapestMonthly !== null && (
              <span className="inline-flex items-center gap-2 rounded-full border border-amber-300 bg-amber-100 py-2 pl-2 pr-4 text-sm font-semibold text-amber-800">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-amber-500 text-xs text-slate-950">
                  S
                </span>
                {t("home.hero.priceBadge", { amount: formatSom(cheapestMonthly, locale) })}
              </span>
            )}
          </div>

          <div
            className="animate-fade-up mx-auto mt-16 grid max-w-3xl grid-cols-3 gap-6 border-t border-amber-200 pt-10"
            style={{ animationDelay: "240ms" }}
          >
            {(["stat1", "stat2", "stat3"] as const).map((key) => (
              <div key={key}>
                <p className="text-2xl font-bold text-amber-700 sm:text-3xl">
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
        <h2 className="text-center text-3xl font-bold text-slate-950">{t("home.features.title")}</h2>
        <div className="mt-12 grid gap-1 overflow-hidden rounded-2xl border border-amber-200 bg-amber-200 sm:grid-cols-2 lg:grid-cols-4">
          {features.map((f) => (
            <div key={f.title} className="flex h-full flex-col bg-white p-6 transition-colors hover:bg-amber-50">
              <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-amber-100">
                <f.icon className="h-5 w-5 text-amber-700" />
              </span>
              <h3 className="mt-3 text-base font-semibold text-slate-950">{f.title}</h3>
              <p className="mt-1.5 text-sm text-slate-600">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Courses carousel */}
      <section id="courses" className="border-y border-amber-200 bg-white py-20">
        <div className="mx-auto max-w-6xl px-4">
          <div className="flex flex-col items-center gap-2 text-center">
            <h2 className="text-3xl font-bold text-slate-950">{t("home.coursesSection.title")}</h2>
            <p className="max-w-xl text-slate-600">{t("home.coursesSection.subtitle")}</p>
          </div>

          {!courses.length && (
            <p className="mt-12 text-center text-slate-500">{t("home.coursesSection.empty")}</p>
          )}

          {courses.length > 0 && (
            <CourseCarousel>
              {courses.map((course, i) => (
                <Link
                  key={course.id}
                  href={`/courses/${course.slug}`}
                  className="group block w-[300px] shrink-0 snap-start overflow-hidden rounded-2xl border border-amber-200 bg-white transition-all duration-300 hover:-translate-y-1.5 hover:border-amber-400 hover:shadow-xl hover:shadow-amber-900/10"
                >
                  <div className="relative aspect-video w-full overflow-hidden bg-amber-50">
                    {course.cover_url ? (
                      <Image
                        src={course.cover_url}
                        alt=""
                        fill
                        sizes="300px"
                        className="object-cover transition-transform duration-500 group-hover:scale-105"
                      />
                    ) : (
                      <div className="flex h-full items-center justify-center">
                        <ImageOff className="h-8 w-8 text-amber-300" />
                      </div>
                    )}
                    <span className="absolute left-3 top-3">
                      <Badge>
                        {course.is_published
                          ? i === 1
                            ? t("home.coursesSection.badgePopular")
                            : t("home.coursesSection.badgeNew")
                          : t("home.coursesSection.badgeComingSoon")}
                      </Badge>
                    </span>
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
            </CourseCarousel>
          )}

          <div className="mt-10 flex justify-center">
            <Button
              asChild
              size="lg"
              className="border border-slate-300 bg-white text-slate-800 hover:bg-slate-100"
            >
              <Link href="/courses">{t("home.coursesSection.viewAll")}</Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="mx-auto max-w-6xl px-4 py-20">
        <div className="text-center">
          <h2 className="text-3xl font-bold text-slate-950">{t("home.testimonials.title")}</h2>
          <p className="mt-2 text-slate-600">{t("home.testimonials.subtitle")}</p>
        </div>
        <div className="mt-12 grid gap-5 sm:grid-cols-3">
          {testimonialItems.map((item) => (
            <div
              key={item.name}
              className="rounded-2xl border border-amber-200 bg-white p-6 transition-transform duration-300 hover:-translate-y-1.5 hover:shadow-lg hover:shadow-amber-900/10"
            >
              <div className="flex gap-0.5 text-amber-500">
                {Array.from({ length: 5 }).map((_, idx) => (
                  <Star key={idx} className="h-3.5 w-3.5 fill-current" />
                ))}
              </div>
              <p className="mt-3 text-sm leading-relaxed text-slate-700">&ldquo;{item.quote}&rdquo;</p>
              <div className="mt-5 flex items-center gap-3 border-t border-amber-100 pt-4">
                <span className="flex h-9 w-9 items-center justify-center rounded-full bg-amber-100 text-xs font-bold text-amber-800">
                  {item.name.charAt(0)}
                </span>
                <div>
                  <p className="text-sm font-semibold text-slate-950">{item.name}</p>
                  <p className="text-xs text-slate-500">{item.role}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Pricing teaser */}
      <section className="border-y border-amber-200 bg-white px-4 py-20 text-center">
        <h2 className="text-3xl font-bold text-slate-950">{t("home.pricingTeaser.title")}</h2>
        <p className="mx-auto mt-3 max-w-xl text-slate-600">{t("home.pricingTeaser.subtitle")}</p>
        <Button asChild size="lg" className="mt-8">
          <Link href="/pricing">{t("home.pricingTeaser.cta")}</Link>
        </Button>
      </section>

      {/* Guarantee */}
      <section className="bg-gradient-to-b from-amber-100 to-amber-50 py-20">
        <div className="mx-auto flex max-w-4xl flex-col items-center gap-4 px-4 text-center">
          <ShieldCheck className="h-10 w-10 text-amber-700" />
          <h2 className="text-3xl font-bold text-slate-950">{t("home.guarantee.title")}</h2>
          <p className="max-w-2xl text-slate-600">{t("home.guarantee.desc")}</p>
        </div>
      </section>

      {/* FAQ */}
      <section className="mx-auto max-w-3xl px-4 py-20">
        <h2 className="text-center text-3xl font-bold text-slate-950">{t("home.faq.title")}</h2>
        <div className="mt-10 divide-y divide-amber-200 rounded-2xl border border-amber-200 bg-white">
          {faqKeys.map((key) => (
            <details key={key} className="group p-5">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-sm font-medium text-slate-950">
                {t(`home.faq.${key}`)}
                <span className="text-amber-600 transition-transform group-open:rotate-45">＋</span>
              </summary>
              <p className="mt-3 text-sm leading-relaxed text-slate-600">
                {t(`home.faq.a${key.slice(1)}`)}
              </p>
            </details>
          ))}
        </div>
      </section>
    </div>
  );
}
