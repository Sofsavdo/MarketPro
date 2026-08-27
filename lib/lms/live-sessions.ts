import { createClient } from "@/lib/supabase/server";
import { localizedField } from "@/lib/courses";
import type { Locale } from "@/i18n/routing";
import type { AccessLevel } from "@/lib/supabase/types";

export interface UpcomingSession {
  id: string;
  course_id: string;
  course_title: string;
  title: string;
  scheduled_at: string;
  duration_minutes: number;
  required_tier: "standard" | "pro";
}

export interface LockedSession {
  courseSlug: string;
  courseTitle: string;
  title: string;
  scheduled_at: string;
  required_tier: "standard" | "pro";
}

const TIER_RANK: Record<AccessLevel, number> = { start: 0, standard: 1, pro: 2 };
const LIVE_TIER_RANK = { standard: 1, pro: 2 } as const;

/**
 * The schedule (title, day/time) is visible to anyone with course access at
 * any tier — RLS's can_view_live_session already restricts rows that way —
 * but *joining* one still requires an enrollment tier that meets the
 * session's required_tier (a bare subscription never qualifies, since it
 * only ever grants "start"). Split here into what the caller can actually
 * join versus what they can only see is happening, so /live can show a
 * locked "upgrade" card instead of a dead link.
 */
export async function getLiveSessionsForUser(
  locale: Locale,
): Promise<{ joinable: UpcomingSession[]; locked: LockedSession[] }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { joinable: [], locked: [] };

  const { data: sessions } = await supabase
    .from("live_sessions")
    .select("*")
    .gt("scheduled_at", new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString())
    .order("scheduled_at", { ascending: true });

  if (!sessions?.length) return { joinable: [], locked: [] };

  const courseIds = [...new Set(sessions.map((s) => s.course_id))];
  const [{ data: courses }, { data: enrollments }] = await Promise.all([
    supabase.from("courses").select("id, slug, title_uz, title_ru, title_en").in("id", courseIds),
    supabase.from("enrollments").select("course_id, tier").eq("user_id", user.id).in("course_id", courseIds),
  ]);
  const courseById = new Map((courses ?? []).map((c) => [c.id, c]));
  const tierByCourse = new Map((enrollments ?? []).map((e) => [e.course_id, e.tier]));

  const joinable: UpcomingSession[] = [];
  const locked: LockedSession[] = [];

  for (const s of sessions) {
    const course = courseById.get(s.course_id);
    if (!course) continue;

    const ownedTier = tierByCourse.get(s.course_id);
    const canJoin = !!ownedTier && TIER_RANK[ownedTier] >= LIVE_TIER_RANK[s.required_tier];

    if (canJoin) {
      joinable.push({
        id: s.id,
        course_id: s.course_id,
        course_title: localizedField(course, "title", locale),
        title: s.title,
        scheduled_at: s.scheduled_at,
        duration_minutes: s.duration_minutes,
        required_tier: s.required_tier,
      });
    } else {
      locked.push({
        courseSlug: course.slug,
        courseTitle: localizedField(course, "title", locale),
        title: s.title,
        scheduled_at: s.scheduled_at,
        required_tier: s.required_tier,
      });
    }
  }

  return { joinable, locked };
}
