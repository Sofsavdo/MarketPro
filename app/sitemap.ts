import type { MetadataRoute } from "next";
import { routing } from "@/i18n/routing";
import { createClient } from "@/lib/supabase/server";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://izdosh.uz";
  const staticPaths = ["", "/courses", "/pricing", "/terms", "/refund-policy", "/contact"];

  const entries: MetadataRoute.Sitemap = routing.locales.flatMap((locale) =>
    staticPaths.map((path) => ({
      url: `${siteUrl}/${locale}${path}`,
      lastModified: new Date(),
    })),
  );

  try {
    const supabase = await createClient();
    const { data: courses } = await supabase.from("courses").select("slug").eq("is_published", true);

    for (const course of courses ?? []) {
      for (const locale of routing.locales) {
        entries.push({
          url: `${siteUrl}/${locale}/courses/${course.slug}`,
          lastModified: new Date(),
        });
      }
    }
  } catch {
    // Supabase not reachable at build time — static entries are still returned.
  }

  return entries;
}
