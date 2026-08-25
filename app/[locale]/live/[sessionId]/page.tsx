import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ChevronLeft, Video, Clock } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { SessionQA } from "@/components/live/session-qa";

export default async function LiveSessionDetailPage({
  params,
}: {
  params: Promise<{ sessionId: string }>;
}) {
  const { sessionId } = await params;
  const t = await getTranslations("live");
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

  if (!session) {
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
    .select("title_uz")
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
        <Badge variant="outline">{session.tier}</Badge>
        <span className="text-sm text-slate-500">{course?.title_uz}</span>
      </div>
      <h1 className="mt-2 text-2xl font-bold text-white sm:text-3xl">{session.title}</h1>

      <div className="mt-4 flex items-center gap-2 text-sm text-slate-400">
        <Clock className="h-4 w-4" />
        {new Date(session.scheduled_at).toLocaleString("uz-UZ", {
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
