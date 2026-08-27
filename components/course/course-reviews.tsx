"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Star, ShieldCheck, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatDate } from "@/lib/utils";
import type { Locale } from "@/i18n/routing";

type Review = {
  id: string;
  rating: number;
  comment: string | null;
  created_at: string;
  full_name: string | null;
};

function StarRow({ rating, size = 16 }: { rating: number; size?: number }) {
  return (
    <div className="flex gap-0.5" aria-label={`${rating}/5`}>
      {[1, 2, 3, 4, 5].map((n) => (
        <Star
          key={n}
          width={size}
          height={size}
          className={n <= rating ? "fill-amber-500 text-amber-500" : "text-slate-700"}
        />
      ))}
    </div>
  );
}

function initials(name: string | null) {
  if (!name) return "T";
  const parts = name.trim().split(/\s+/);
  return ((parts[0]?.[0] ?? "") + (parts[1]?.[0] ?? "")).toUpperCase() || "T";
}

export function CourseReviews({
  reviews,
  average,
  canReview,
  existingReview,
  action,
  locale,
}: {
  reviews: Review[];
  average: number | null;
  canReview: boolean;
  existingReview: { rating: number; status: "pending" | "approved" } | null;
  action: (formData: FormData) => Promise<void>;
  locale: Locale;
}) {
  const t = useTranslations("course.reviews");
  const [rating, setRating] = useState(existingReview?.rating ?? 5);

  return (
    <section className="mt-16 border-t border-slate-800/80 pt-10">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <h2 className="text-2xl font-bold text-white">{t("title")}</h2>
        {average !== null && (
          <div className="flex items-center gap-2 rounded-full border border-slate-800 bg-slate-900/60 px-3 py-1.5 text-sm">
            <StarRow rating={Math.round(average)} />
            <span className="font-semibold text-white">{average.toFixed(1)}</span>
            <span className="text-slate-500">({reviews.length})</span>
          </div>
        )}
      </div>

      {existingReview?.status === "pending" && (
        <div className="mt-5 flex items-start gap-2.5 rounded-xl border border-dashed border-amber-500/40 bg-amber-500/5 p-4 text-sm text-amber-200/90">
          <Clock className="mt-0.5 h-4 w-4 shrink-0 text-amber-400" />
          <p>{t("pendingNotice")}</p>
        </div>
      )}

      {canReview && (
        <form
          action={action}
          className="mt-5 rounded-xl border border-slate-800 bg-slate-900/40 p-5 transition-colors focus-within:border-amber-500/40"
        >
          <p className="text-sm font-medium text-slate-300">{t("yourRating")}</p>
          <div className="mt-2 flex gap-1">
            {[1, 2, 3, 4, 5].map((n) => (
              <button
                key={n}
                type="button"
                onClick={() => setRating(n)}
                aria-label={`${n}`}
                className="rounded p-0.5 transition-transform hover:scale-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500"
              >
                <Star
                  width={24}
                  height={24}
                  className={n <= rating ? "fill-amber-500 text-amber-500" : "text-slate-700"}
                />
              </button>
            ))}
          </div>
          <input type="hidden" name="rating" value={rating} />
          <textarea
            name="comment"
            rows={3}
            defaultValue=""
            placeholder={t("commentPlaceholder")}
            className="mt-3 w-full resize-none rounded-lg border border-slate-700 bg-slate-900 px-3 py-2.5 text-sm text-white placeholder:text-slate-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500"
          />
          <Button type="submit" size="sm" className="mt-3">
            {existingReview ? t("update") : t("submit")}
          </Button>
        </form>
      )}

      <div className="mt-6 grid gap-3 sm:grid-cols-2">
        {reviews.map((r) => (
          <div
            key={r.id}
            className="rounded-xl border border-slate-800 bg-slate-900/30 p-4 transition-colors hover:border-slate-700"
          >
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-2.5">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-amber-500/10 text-xs font-semibold text-amber-400">
                  {initials(r.full_name)}
                </span>
                <div className="min-w-0">
                  <span className="block truncate text-sm font-medium text-slate-200">
                    {r.full_name || t("anon")}
                  </span>
                  <span className="flex items-center gap-1 text-[11px] text-emerald-400/90">
                    <ShieldCheck className="h-3 w-3" /> {t("verified")}
                  </span>
                </div>
              </div>
              <span className="shrink-0 text-xs text-slate-500">{formatDate(r.created_at, locale)}</span>
            </div>
            <div className="mt-3">
              <StarRow rating={r.rating} />
            </div>
            {r.comment && <p className="mt-2 text-sm leading-relaxed text-slate-400">{r.comment}</p>}
          </div>
        ))}
        {!reviews.length && (
          <p className="text-sm text-slate-500 sm:col-span-2">{t("empty")}</p>
        )}
      </div>
    </section>
  );
}
