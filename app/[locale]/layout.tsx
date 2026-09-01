import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import { NextIntlClientProvider, hasLocale } from "next-intl";
import { getTranslations } from "next-intl/server";
import { notFound } from "next/navigation";
import { routing } from "@/i18n/routing";
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import "../globals.css";

// Brand book §7: Inter or Manrope for the primary typeface.
const sans = Inter({ variable: "--font-geist-sans", subsets: ["latin", "cyrillic"] });
const mono = JetBrains_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://izdosh.uz";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "brand" });
  const tSeo = await getTranslations({ locale, namespace: "seo" });
  const title = { default: t("fullName"), template: `%s — ${t("fullName")}` };
  const description = t("tagline");

  return {
    metadataBase: new URL(siteUrl),
    title,
    description,
    keywords: tSeo("homeKeywords"),
    alternates: {
      canonical: `/${locale}`,
      languages: Object.fromEntries(routing.locales.map((l) => [l, `/${l}`])),
    },
    openGraph: { title: t("fullName"), description, siteName: t("fullName"), locale, type: "website" },
    twitter: { card: "summary_large_image", title: t("fullName"), description },
  };
}

/**
 * Organization structured data (schema.org, via JSON-LD) — helps both
 * Google's entity understanding (Knowledge Panel eligibility) and AI
 * systems that crawl for structured facts about a brand rather than
 * free-form text. Rendered on every locale's every page since it's the
 * same entity regardless of which page or language someone lands on.
 */
async function OrganizationJsonLd({ locale }: { locale: string }) {
  const t = await getTranslations({ locale, namespace: "brand" });
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "EducationalOrganization",
    name: t("fullName"),
    alternateName: t("name"),
    url: siteUrl,
    description: t("tagline"),
    sameAs: ["https://t.me/izdosh_academy", "https://instagram.com/izdosh.uz"],
  };
  return (
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
  );
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) {
    notFound();
  }

  return (
    <html lang={locale} className={`${sans.variable} ${mono.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col bg-slate-950">
        <OrganizationJsonLd locale={locale} />
        <NextIntlClientProvider>
          <Header />
          <main className="flex-1">{children}</main>
          <Footer />
        </NextIntlClientProvider>
      </body>
    </html>
  );
}

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}
