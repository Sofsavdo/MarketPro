import { createPublicClient } from "@/lib/supabase/server";
import type { Locale } from "@/i18n/routing";

/**
 * Every landing_blocks.key the home page understands, in the order the
 * table's own order_index seeds them at (admin can reorder from there).
 */
export const LANDING_BLOCK_KEYS = [
  "hero",
  "features",
  "courses_carousel",
  "testimonials",
  "pricing_teaser",
  "guarantee",
  "faq",
  "gallery",
] as const;
export type LandingBlockKey = (typeof LANDING_BLOCK_KEYS)[number];

export interface HeroContent {
  eyebrow: string;
  title: string;
  subtitle: string;
  ctaPrimary: string;
  ctaSecondary: string;
  stat1Value: string;
  stat1Label: string;
  stat2Value: string;
  stat2Label: string;
  stat3Value: string;
  stat3Label: string;
  /** Optional hero image, uploaded from /admin/landing — same photo across all 3 locales. */
  imageUrl?: string;
}
export interface FeatureItem {
  title: string;
  desc: string;
}
export interface FeaturesContent {
  title: string;
  items: FeatureItem[];
}
export interface CoursesCarouselContent {
  title: string;
  subtitle: string;
}
export interface TestimonialItem {
  quote: string;
  name: string;
  role: string;
}
export interface TestimonialsContent {
  title: string;
  subtitle: string;
  items: TestimonialItem[];
}
export interface PricingTeaserContent {
  title: string;
  subtitle: string;
  cta: string;
}
export interface GuaranteeContent {
  title: string;
  desc: string;
}
export interface FaqItem {
  q: string;
  a: string;
}
export interface FaqContent {
  title: string;
  items: FaqItem[];
}
export interface GalleryItem {
  imageUrl: string;
  caption: string;
}
export interface GalleryContent {
  title: string;
  subtitle: string;
  items: GalleryItem[];
}

/** Maps a block key to its per-locale content's TypeScript shape. */
export interface LandingBlockContentMap {
  hero: HeroContent;
  features: FeaturesContent;
  courses_carousel: CoursesCarouselContent;
  testimonials: TestimonialsContent;
  pricing_teaser: PricingTeaserContent;
  guarantee: GuaranteeContent;
  faq: FaqContent;
  gallery: GalleryContent;
}

export interface LandingBlock<K extends LandingBlockKey = LandingBlockKey> {
  key: K;
  isVisible: boolean;
  orderIndex: number;
  content: Record<Locale, LandingBlockContentMap[K]>;
}

/**
 * Cookie-free public client deliberately — every visitor sees the same
 * landing content (RLS already makes it world-readable), and the home page
 * caches this via its own `revalidate`, same pattern as getPublishedCourses.
 */
export async function getLandingBlocks(): Promise<LandingBlock[]> {
  const supabase = await createPublicClient();
  const { data } = await supabase
    .from("landing_blocks")
    .select("*")
    .order("order_index", { ascending: true });

  return (data ?? [])
    .filter((row): row is typeof row & { key: LandingBlockKey } =>
      (LANDING_BLOCK_KEYS as readonly string[]).includes(row.key),
    )
    .map((row) => ({
      key: row.key,
      isVisible: row.is_visible,
      orderIndex: row.order_index,
      content: row.content as Record<Locale, LandingBlockContentMap[LandingBlockKey]>,
    }));
}

/**
 * Reads one block's content for one locale, falling back to Uzbek (the
 * source-of-truth locale everything gets translated from) if a translation
 * is missing — never falls back to `null`, so a caller never has to handle
 * "the hero has no title" as a real case.
 */
export function localizedBlockContent<K extends LandingBlockKey>(
  block: LandingBlock | undefined,
  locale: Locale,
): LandingBlockContentMap[K] | null {
  if (!block) return null;
  const content = block.content as Record<Locale, LandingBlockContentMap[K]>;
  return content[locale] ?? content.uz ?? null;
}
