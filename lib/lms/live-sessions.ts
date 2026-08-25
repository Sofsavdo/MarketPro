import { createClient } from "@/lib/supabase/server";

export interface UpcomingSession {
  id: string;
  course_id: string;
  course_title: string;
  tier: "standard" | "pro";
  title: string;
  scheduled_at: string;
  duration_minutes: number;
}

/**
 * Sessions the current user can join — RLS (has_live_session_access) already
 * restricts rows to the user's tier (subscription or per-course enrollment),
 * this just joins in the course title and orders by start time.
 */
export async function getUpcomingSessionsForUser(): Promise<UpcomingSession[]> {
  const supabase = await createClient();

  const { data: sessions } = await supabase
    .from("live_sessions")
    .select("*")
    .gt("scheduled_at", new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString())
    .order("scheduled_at", { ascending: true });

  if (!sessions?.length) return [];

  const courseIds = [...new Set(sessions.map((s) => s.course_id))];
  const { data: courses } = await supabase.from("courses").select("id, title_uz").in("id", courseIds);
  const courseById = new Map((courses ?? []).map((c) => [c.id, c.title_uz]));

  return sessions.map((s) => ({
    id: s.id,
    course_id: s.course_id,
    course_title: courseById.get(s.course_id) ?? "",
    tier: s.tier,
    title: s.title,
    scheduled_at: s.scheduled_at,
    duration_minutes: s.duration_minutes,
  }));
}
