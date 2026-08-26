import { createClient, createAdminClient } from "@/lib/supabase/server";
import { localizedField } from "@/lib/courses";
import type { Locale } from "@/i18n/routing";

export interface UpcomingSession {
  id: string;
  course_id: string;
  course_title: string;
  title: string;
  scheduled_at: string;
  duration_minutes: number;
}

/**
 * Sessions the current user can join — RLS (has_live_session_access) already
 * restricts rows to courses the user bought outright (VIP access; a bare
 * subscription never unlocks live sessions), this just joins in the course
 * title and orders by start time.
 */
export async function getUpcomingSessionsForUser(locale: Locale): Promise<UpcomingSession[]> {
  const supabase = await createClient();

  const { data: sessions } = await supabase
    .from("live_sessions")
    .select("*")
    .gt("scheduled_at", new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString())
    .order("scheduled_at", { ascending: true });

  if (!sessions?.length) return [];

  const courseIds = [...new Set(sessions.map((s) => s.course_id))];
  const { data: courses } = await supabase
    .from("courses")
    .select("id, title_uz, title_ru, title_en")
    .in("id", courseIds);
  const courseById = new Map((courses ?? []).map((c) => [c.id, c]));

  return sessions.map((s) => {
    const course = courseById.get(s.course_id);
    return {
      id: s.id,
      course_id: s.course_id,
      course_title: course ? localizedField(course, "title", locale) : "",
      title: s.title,
      scheduled_at: s.scheduled_at,
      duration_minutes: s.duration_minutes,
    };
  });
}

export interface LockedSession {
  courseSlug: string;
  courseTitle: string;
  title: string;
  scheduled_at: string;
}

/**
 * Live sessions the user's active subscription grants "start" (video only)
 * access to but not VIP — used to show a locked "VIP'ga o'ting" upsell
 * card instead of just silently omitting them the way RLS does. Only
 * meaningful for someone with an active subscription; returns [] otherwise
 * (no reason to tease a non-subscriber with sessions they can't preview at
 * all — the course page already sells VIP directly).
 */
export async function getLockedSessionsForSubscriber(locale: Locale): Promise<LockedSession[]> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  const { data: subscription } = await supabase
    .from("subscriptions")
    .select("status, current_period_end")
    .eq("user_id", user.id)
    .eq("status", "active")
    .gt("current_period_end", new Date().toISOString())
    .maybeSingle();
  if (!subscription) return [];

  const { data: enrollments } = await supabase
    .from("enrollments")
    .select("course_id")
    .eq("user_id", user.id);
  const vipCourseIds = new Set((enrollments ?? []).map((e) => e.course_id));

  const admin = await createAdminClient();
  const { data: sessions } = await admin
    .from("live_sessions")
    .select("course_id, title, scheduled_at")
    .gt("scheduled_at", new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString())
    .order("scheduled_at", { ascending: true });

  const locked = (sessions ?? []).filter((s) => !vipCourseIds.has(s.course_id));
  if (!locked.length) return [];

  const courseIds = [...new Set(locked.map((s) => s.course_id))];
  const { data: courses } = await admin
    .from("courses")
    .select("id, slug, title_uz, title_ru, title_en")
    .in("id", courseIds);
  const courseById = new Map((courses ?? []).map((c) => [c.id, c]));

  return locked
    .map((s) => {
      const course = courseById.get(s.course_id);
      if (!course) return null;
      return {
        courseSlug: course.slug,
        courseTitle: localizedField(course, "title", locale),
        title: s.title,
        scheduled_at: s.scheduled_at,
      };
    })
    .filter((s): s is LockedSession => s !== null);
}
