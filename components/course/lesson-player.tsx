"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { CheckCircle2, XCircle, FileText, Presentation, Image as ImageIcon, Link as LinkIcon, Download } from "lucide-react";
import { cn } from "@/lib/utils";

const ReactPlayer = dynamic(() => import("react-player"), { ssr: false });

interface Question {
  id: string;
  question: string;
  options: string[];
}

interface Material {
  id: string;
  title: string;
  fileUrl: string;
  fileType: string;
}

const MATERIAL_ICONS: Record<string, typeof FileText> = {
  pdf: FileText,
  pptx: Presentation,
  doc: FileText,
  image: ImageIcon,
  link: LinkIcon,
};

export function LessonPlayer({
  courseId,
  courseSlug,
  lessonId,
  videoUrl,
  content,
  questions,
  alreadyCompleted,
  quizAlreadyPassed,
  materials = [],
}: {
  courseId: string;
  courseSlug: string;
  lessonId: string;
  videoUrl: string;
  content?: string;
  questions: Question[];
  alreadyCompleted: boolean;
  quizAlreadyPassed: boolean;
  materials?: Material[];
}) {
  const t = useTranslations("lesson");
  const router = useRouter();

  const [videoWatched, setVideoWatched] = useState(alreadyCompleted || !videoUrl);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [quizResult, setQuizResult] = useState<"passed" | "failed" | null>(
    quizAlreadyPassed ? "passed" : null,
  );
  const [grading, setGrading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const hasQuiz = questions.length > 0;
  const quizComplete = answers && Object.keys(answers).length === questions.length;
  const canComplete = videoWatched && (!hasQuiz || quizResult === "passed") && !alreadyCompleted;

  async function submitQuiz() {
    setGrading(true);
    try {
      const res = await fetch("/api/lessons/quiz/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lessonId, answers }),
      });
      const data = await res.json();
      setQuizResult(data.passed ? "passed" : "failed");
    } finally {
      setGrading(false);
    }
  }

  async function completeLesson() {
    setSubmitting(true);
    try {
      const res = await fetch("/api/lessons/complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ courseId, lessonId }),
      });
      const data = await res.json();
      router.refresh();
      if (data.nextLessonId) {
        router.push(`/courses/${courseSlug}/lessons/${data.nextLessonId}`);
      } else {
        router.push(`/courses/${courseSlug}`);
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="mt-8 space-y-8">
      {videoUrl && (
        <div className="aspect-video overflow-hidden rounded-2xl border border-slate-800 bg-black">
          <ReactPlayer
            src={videoUrl}
            width="100%"
            height="100%"
            controls
            onEnded={() => setVideoWatched(true)}
          />
        </div>
      )}

      {content && (
        <div className="prose prose-invert prose-slate max-w-none text-slate-300">{content}</div>
      )}

      {!videoUrl && !content && materials.length === 0 && (
        <div className="flex aspect-video items-center justify-center rounded-2xl border border-dashed border-slate-800 text-slate-600">
          {t("videoComingSoon")}
        </div>
      )}

      {materials.length > 0 && (
        <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-6">
          <h3 className="text-lg font-semibold text-white">{t("materialsTitle")}</h3>
          <div className="mt-4 space-y-2">
            {materials.map((material) => {
              const Icon = MATERIAL_ICONS[material.fileType] ?? FileText;
              return (
                <a
                  key={material.id}
                  href={material.fileUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-3 rounded-lg border border-slate-800 px-4 py-3 text-sm text-slate-200 hover:border-amber-500/50 hover:text-white"
                >
                  <Icon className="h-5 w-5 shrink-0 text-amber-500" />
                  <span className="flex-1">{material.title}</span>
                  <Download className="h-4 w-4 shrink-0 text-slate-500" />
                </a>
              );
            })}
          </div>
        </div>
      )}

      {hasQuiz && !alreadyCompleted && (
        <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-6">
          <h3 className="text-lg font-semibold text-white">{t("quizTitle")}</h3>
          <div className="mt-4 space-y-6">
            {questions.map((q, qi) => (
              <div key={q.id}>
                <p className="font-medium text-slate-200">
                  {qi + 1}. {q.question}
                </p>
                <div className="mt-2 space-y-2">
                  {q.options.map((option, oi) => (
                    <label
                      key={oi}
                      className={cn(
                        "flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 text-sm",
                        answers[q.id] === oi
                          ? "border-amber-500 bg-amber-500/10 text-white"
                          : "border-slate-800 text-slate-300 hover:border-slate-700",
                      )}
                    >
                      <input
                        type="radio"
                        name={q.id}
                        className="accent-amber-500"
                        checked={answers[q.id] === oi}
                        onChange={() => setAnswers((a) => ({ ...a, [q.id]: oi }))}
                      />
                      {option}
                    </label>
                  ))}
                </div>
              </div>
            ))}
          </div>

          <Button className="mt-6" disabled={!quizComplete || grading} onClick={submitQuiz}>
            {grading ? "..." : t("quizSubmit")}
          </Button>

          {quizResult && (
            <p
              className={cn(
                "mt-3 flex items-center gap-2 text-sm",
                quizResult === "passed" ? "text-emerald-400" : "text-red-400",
              )}
            >
              {quizResult === "passed" ? (
                <CheckCircle2 className="h-4 w-4" />
              ) : (
                <XCircle className="h-4 w-4" />
              )}
              {quizResult === "passed" ? t("quizPassed") : t("quizFailed")}
            </p>
          )}
        </div>
      )}

      {!alreadyCompleted ? (
        <Button size="lg" disabled={!canComplete || submitting} onClick={completeLesson}>
          {submitting ? "..." : t("completeButton")}
        </Button>
      ) : (
        <p className="flex items-center gap-2 text-emerald-400">
          <CheckCircle2 className="h-5 w-5" /> {t("quizPassed")}
        </p>
      )}
    </div>
  );
}
