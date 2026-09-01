"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { Link, useRouter } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { CheckCircle2, XCircle, FileText, Presentation, Image as ImageIcon, Link as LinkIcon, Download, ChevronLeft, ChevronRight, Lock } from "lucide-react";
import { cn } from "@/lib/utils";
import { VideoWatermark, BrandWatermark } from "@/components/course/video-watermark";

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
  videoEmbedUrl,
  content,
  questions,
  alreadyCompleted,
  quizAlreadyPassed,
  materials = [],
  watermarkText,
  prevLessonId,
  nextLessonId,
  nextLocked,
  hasCourseAccess,
}: {
  courseId: string;
  courseSlug: string;
  lessonId: string;
  /** Pre-signed Bunny Stream embed URL (see lib/video/bunny.ts), or undefined for a text-only lesson. */
  videoEmbedUrl?: string;
  content?: string;
  questions: Question[];
  alreadyCompleted: boolean;
  quizAlreadyPassed: boolean;
  materials?: Material[];
  /** Student's phone + short id, stamped over the video (see VideoWatermark). */
  watermarkText?: string;
  /** Adjacent lessons in course order, for the prev/next nav row below. */
  prevLessonId?: string;
  nextLessonId?: string;
  /** Whether the next lesson is still locked for this user. */
  nextLocked?: boolean;
  /** Whether this student has bought the course at all — decides *why* the next lesson is locked. */
  hasCourseAccess?: boolean;
}) {
  const t = useTranslations("lesson");
  const router = useRouter();
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const [videoWatched, setVideoWatched] = useState(alreadyCompleted || !videoEmbedUrl);
  const [videoError, setVideoError] = useState(false);

  // Bunny's embed player speaks the player.js postMessage protocol
  // (docs.bunny.net/stream/playback-api): it posts an unprompted "ready"
  // event, after which a listener must be registered for any other event —
  // "ended" here, to unlock lesson completion the same way onEnded used to.
  useEffect(() => {
    if (!videoEmbedUrl || videoError) return;

    function post(message: Record<string, unknown>) {
      iframeRef.current?.contentWindow?.postMessage(JSON.stringify(message), "*");
    }

    function handleMessage(event: MessageEvent) {
      if (typeof event.data !== "string") return;
      let data: { context?: string; event?: string } | null = null;
      try {
        data = JSON.parse(event.data);
      } catch {
        return;
      }
      if (data?.context !== "player.js") return;

      if (data.event === "ready") {
        post({ context: "player.js", version: "0.0.1", method: "addEventListener", value: "ended", listener: "ended" });
        post({ context: "player.js", version: "0.0.1", method: "addEventListener", value: "error", listener: "error" });
      } else if (data.event === "ended") {
        setVideoWatched(true);
      } else if (data.event === "error") {
        setVideoError(true);
      }
    }

    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, [videoEmbedUrl, videoError]);
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
      {videoEmbedUrl && (
        <div className="relative aspect-video overflow-hidden rounded-2xl border border-slate-800 bg-black">
          {videoError ? (
            <div className="flex h-full flex-col items-center justify-center gap-2 px-6 text-center text-slate-500">
              <XCircle className="h-8 w-8 text-red-400" />
              <p className="text-sm">{t("videoError")}</p>
            </div>
          ) : (
            <>
              <iframe
                ref={iframeRef}
                src={videoEmbedUrl}
                className="h-full w-full"
                allow="accelerometer;gyroscope;autoplay;encrypted-media;picture-in-picture;"
                allowFullScreen
                onError={() => setVideoError(true)}
              />
              <BrandWatermark />
              {watermarkText && <VideoWatermark text={watermarkText} />}
            </>
          )}
        </div>
      )}

      {content && (
        <div className="prose prose-invert prose-slate max-w-none text-slate-300">{content}</div>
      )}

      {!videoEmbedUrl && !content && materials.length === 0 && (
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
          <CheckCircle2 className="h-5 w-5" /> {t("lessonCompleted")}
        </p>
      )}

      {(prevLessonId || nextLessonId) && (
        <div className="flex items-center justify-between gap-3 border-t border-slate-800 pt-6">
          {prevLessonId ? (
            <Button asChild variant="outline" size="sm">
              <Link href={`/courses/${courseSlug}/lessons/${prevLessonId}`}>
                <ChevronLeft className="h-4 w-4" /> {t("prevLesson")}
              </Link>
            </Button>
          ) : (
            <span />
          )}
          {nextLessonId &&
            (nextLocked ? (
              hasCourseAccess ? (
                <div className="flex flex-col items-end gap-1">
                  <Button size="sm" variant="outline" disabled className="gap-1.5">
                    <Lock className="h-3.5 w-3.5" /> {t("nextLesson")}
                  </Button>
                  <p className="text-xs text-slate-500">{t("nextLockedSequence")}</p>
                </div>
              ) : (
                <div className="flex flex-col items-end gap-1">
                  <Button asChild size="sm" variant="outline" className="gap-1.5">
                    <Link href={`/courses/${courseSlug}#purchase`}>
                      <Lock className="h-3.5 w-3.5" /> {t("nextLesson")}
                    </Link>
                  </Button>
                  <Link
                    href={`/courses/${courseSlug}#purchase`}
                    className="text-xs text-amber-400 hover:underline"
                  >
                    {t("nextLockedPurchase")}
                  </Link>
                </div>
              )
            ) : (
              <Button asChild size="sm">
                <Link href={`/courses/${courseSlug}/lessons/${nextLessonId}`}>
                  {t("nextLesson")} <ChevronRight className="h-4 w-4" />
                </Link>
              </Button>
            ))}
        </div>
      )}
    </div>
  );
}
