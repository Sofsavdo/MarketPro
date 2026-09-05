import { redirect } from "next/navigation";
import { getTranslations, getLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ChevronLeft, Video, Clock } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { SessionQA } from "@/components/live/session-qa";
import { localizedField } from "@/lib/courses";
import { formatDateTime } from "@/lib/utils";
import type { Locale } from "@/i18n/routing";

export default async function LiveSessionDetailPage({
  params,
}: {
  params: Promise<{ sessionId: string }>;
}) {
  const { sessionId } = await params;
  const t = await getTranslations("live");
  const locale = (await getLocale()) as Locale;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: session } = await supabase
    .from("live_sessions")
    .select("*")
    .eq("id", sessionId)
    .maybeSingle();

  // The SELECT policy (can_view_live_session) deliberately lets anyone with
  // *any* course access see this row exists — the schedule is meant to be
  // visible to subscribers too, so they can see what they're missing. But
  // actually joining still requires an enrollment tier meeting the
  // session's required_tier, which RLS does NOT enforce here, so it has to
  // be checked explicitly before the meet_url/Join button ever renders.
  const { data: enrollment } = session
    ? await supabase
        .from("enrollments")
        .select("tier")
        .eq("user_id", user.id)
        .eq("course_id", session.course_id)
        .maybeSingle()
    : { data: null };

  const TIER_RANK = { start: 0, standard: 1, pro: 2 } as const;
  const LIVE_TIER_RANK = { standard: 1, pro: 2 } as const;
  const canJoin =
    !!session &&
    !!enrollment &&
    TIER_RANK[enrollment.tier] >= LIVE_TIER_RANK[session.required_tier];

  if (!session || !canJoin) {
    return (
      <div className="mx-auto max-w-xl px-4 py-24 text-center">
        <p className="text-slate-400">{t("noAccess")}</p>
        <Button asChild variant="outline" className="mt-6">
          <Link href="/live">{t("backToList")}</Link>
        </Button>
      </div>
    );
  }

  const { data: course } = await supabase
    .from("courses")
    .select("*")
    .eq("id", session.course_id)
    .maybeSingle();

  const { data: questions } = await supabase
    .from("session_questions")
    .select("id, question, answer, user_id")
    .eq("session_id", sessionId)
    .order("created_at", { ascending: true });

  return (
    <div className="mx-auto max-w-2xl px-4 py-16">
      <Link href="/live" className="inline-flex items-center gap-1 text-sm text-slate-400 hover:text-white">
        <ChevronLeft className="h-4 w-4" /> {t("backToList")}
      </Link>

      <div className="mt-4 flex items-center gap-2">
        <Badge variant="outline">{session.required_tier === "pro" ? "Pro" : "Standart"}</Badge>
        <span className="text-sm text-slate-500">
          {course && localizedField(course, "title", locale)}
        </span>
      </div>
      <h1 className="mt-2 text-2xl font-bold text-white sm:text-3xl">{session.title}</h1>

      <div className="mt-4 flex items-center gap-2 text-sm text-slate-400">
        <Clock className="h-4 w-4" />
        {formatDateTime(session.scheduled_at, locale, {
          dateStyle: "full",
          timeStyle: "short",
        })}{" "}
        · {session.duration_minutes} {t("duration")}
      </div>

      <Button asChild size="lg" className="mt-6">
        <a href={session.meet_url} target="_blank" rel="noreferrer">
          <Video className="h-4 w-4" /> {t("join")}
        </a>
      </Button>

      <div className="mt-14">
        <h2 className="text-lg font-semibold text-white">{t("qaTitle")}</h2>
        <p className="mt-1 text-sm text-slate-400">{t("qaDesc")}</p>
        <div className="mt-6">
          <SessionQA sessionId={sessionId} initialQuestions={questions ?? []} currentUserId={user.id} />
        </div>
      </div>
    </div>
  );
}
