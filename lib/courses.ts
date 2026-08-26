import { createClient, createPublicClient } from "@/lib/supabase/server";
import type { Locale } from "@/i18n/routing";

/**
 * Uses the cookie-free public client deliberately — this list is the same
 * for everyone (courses RLS already allows anyone to read it), and the
 * homepage/catalog pages that call this are the ones we want to actually
 * cache (see `revalidate` on those pages) rather than hit Supabase on every
 * request.
 */
export async function getPublishedCourses() {
  const supabase = await createPublicClient();
  const { data } = await supabase
    .from("courses")
    .select("*")
    .order("order_index", { ascending: true });
  return data ?? [];
}

export async function getCourseBySlug(slug: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("courses")
    .select("*")
    .eq("slug", slug)
    .maybeSingle();
  return data;
}

export async function getCourseModulesWithLessons(courseId: string) {
  const supabase = await createClient();
  const { data: modules } = await supabase
    .from("modules")
    .select("*")
    .eq("course_id", courseId)
    .order("order_index", { ascending: true });

  const { data: lessons } = await supabase
    .from("lessons")
    .select("*")
    .eq("course_id", courseId)
    .order("order_index", { ascending: true });

  return (modules ?? []).map((mod) => ({
    ...mod,
    lessons: (lessons ?? []).filter((l) => l.module_id === mod.id),
  }));
}

export function localizedField<T extends Record<string, unknown>>(
  row: T,
  field: string,
  locale: Locale,
) {
  return (row[`${field}_${locale}`] ?? row[`${field}_uz`]) as string;
}
