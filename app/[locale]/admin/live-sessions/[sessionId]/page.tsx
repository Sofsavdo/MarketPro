import { notFound } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/server";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { answerSessionQuestion } from "@/lib/lms/admin-actions";
import { formatDateTime } from "@/lib/utils";

export default async function AdminSessionQuestionsPage({
  params,
}: {
  params: Promise<{ sessionId: string }>;
}) {
  const { sessionId } = await params;
  const supabase = await createAdminClient();

  const { data: session } = await supabase
    .from("live_sessions")
    .select("*")
    .eq("id", sessionId)
    .maybeSingle();
  if (!session) notFound();

  const { data: questions } = await supabase
    .from("session_questions")
    .select("*")
    .eq("session_id", sessionId)
    .order("created_at", { ascending: true });

  return (
    <div>
      <h1 className="text-2xl font-bold text-white">{session.title}</h1>
      <p className="mt-1 text-sm text-slate-500">
        {formatDateTime(session.scheduled_at)}
      </p>

      <div className="mt-8 space-y-4">
        {(questions ?? []).map((q) => (
          <div key={q.id} className="rounded-lg border border-slate-800 p-4">
            <p className="text-white">{q.question}</p>
            {q.answer ? (
              <p className="mt-2 rounded-lg bg-slate-900/60 p-3 text-sm text-emerald-400">
                {q.answer}
              </p>
            ) : (
              <form
                action={answerSessionQuestion.bind(null, q.id, sessionId)}
                className="mt-3 flex gap-2"
              >
                <Input name="answer" placeholder="Javob yozing..." required />
                <Button type="submit" size="sm">
                  Javob berish
                </Button>
              </form>
            )}
          </div>
        ))}
        {!questions?.length && (
          <p className="text-sm text-slate-500">Hozircha savol yo&apos;q.</p>
        )}
      </div>
    </div>
  );
}
