"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { createClient } from "@/lib/supabase/client";
import { postSessionQuestion } from "@/lib/lms/live-actions";
import { Button } from "@/components/ui/button";
import { CheckCircle2 } from "lucide-react";

interface Question {
  id: string;
  question: string;
  answer: string | null;
  user_id: string;
}

export function SessionQA({
  sessionId,
  initialQuestions,
  currentUserId,
}: {
  sessionId: string;
  initialQuestions: Question[];
  currentUserId: string;
}) {
  const t = useTranslations("live");
  const [questions, setQuestions] = useState<Question[]>(initialQuestions);
  const [text, setText] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel(`session_questions:${sessionId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "session_questions", filter: `session_id=eq.${sessionId}` },
        (payload) => {
          const row = payload.new as Question;
          setQuestions((prev) => (prev.some((q) => q.id === row.id) ? prev : [...prev, row]));
        },
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "session_questions", filter: `session_id=eq.${sessionId}` },
        (payload) => {
          const row = payload.new as Question;
          setQuestions((prev) => prev.map((q) => (q.id === row.id ? row : q)));
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [sessionId]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!text.trim()) return;
    setSubmitting(true);
    const formData = new FormData();
    formData.set("question", text);
    try {
      await postSessionQuestion(sessionId, formData);
      setText("");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div>
      <div className="space-y-3">
        {questions.map((q) => (
          <div key={q.id} className="rounded-lg border border-slate-800 bg-slate-900/40 p-4">
            <p className="text-sm text-slate-200">
              {q.question}
              {q.user_id === currentUserId && (
                <span className="ml-2 text-xs text-amber-500">(siz)</span>
              )}
            </p>
            {q.answer ? (
              <p className="mt-2 flex items-start gap-2 rounded-lg bg-emerald-500/10 p-3 text-sm text-emerald-400">
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
                {q.answer}
              </p>
            ) : (
              <p className="mt-2 text-xs text-slate-500">{t("waitingAnswer")}</p>
            )}
          </div>
        ))}
      </div>

      <form onSubmit={handleSubmit} className="mt-6 flex gap-2">
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={t("askPlaceholder")}
          className="flex-1 rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white placeholder:text-slate-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500"
        />
        <Button type="submit" disabled={submitting || !text.trim()}>
          {t("askButton")}
        </Button>
      </form>
    </div>
  );
}
