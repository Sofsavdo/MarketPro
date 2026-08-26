"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Star } from "lucide-react";
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
    <div className="flex gap-0.5">
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

export function CourseReviews({
  reviews,
  average,
  canReview,
  existingRating,
  action,
  locale,
}: {
  reviews: Review[];
  average: number | null;
  canReview: boolean;
  existingRating: number | null;
  action: (formData: FormData) => Promise<void>;
  locale: Locale;
}) {
  const t = useTranslations("course.reviews");
  const [rating, setRating] = useState(existingRating ?? 5);

  return (
    <div className="mt-14">
      <div className="flex items-center gap-3">
        <h2 className="text-2xl font-bold text-white">{t("title")}</h2>
        {average !== null && (
          <div className="flex items-center gap-1.5 text-sm text-slate-400">
            <StarRow rating={Math.round(average)} />
            <span>
              {average.toFixed(1)} ({reviews.length})
            </span>
          </div>
        )}
      </div>

      {canReview && (
        <form action={action} className="mt-4 rounded-lg border border-slate-800 bg-slate-900/40 p-4">
          <p className="text-sm font-medium text-slate-300">{t("yourRating")}</p>
          <div className="mt-2 flex gap-1">
            {[1, 2, 3, 4, 5].map((n) => (
              <button
                key={n}
                type="button"
                onClick={() => setRating(n)}
                aria-label={`${n}`}
                className="p-0.5"
              >
                <Star
                  width={22}
                  height={22}
                  className={n <= rating ? "fill-amber-500 text-amber-500" : "text-slate-700"}
                />
              </button>
            ))}
          </div>
          <input type="hidden" name="rating" value={rating} />
          <textarea
            name="comment"
            rows={3}
            placeholder={t("commentPlaceholder")}
            className="mt-3 w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white placeholder:text-slate-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500"
          />
          <Button type="submit" size="sm" className="mt-3">
            {existingRating ? t("update") : t("submit")}
          </Button>
        </form>
      )}

      <div className="mt-6 space-y-3">
        {reviews.map((r) => (
          <div key={r.id} className="rounded-lg border border-slate-800 p-4">
            <div className="flex items-center justify-between gap-2">
              <span className="text-sm font-medium text-slate-200">{r.full_name || t("anon")}</span>
              <span className="text-xs text-slate-500">{formatDate(r.created_at, locale)}</span>
            </div>
            <div className="mt-1">
              <StarRow rating={r.rating} />
            </div>
            {r.comment && <p className="mt-2 text-sm text-slate-400">{r.comment}</p>}
          </div>
        ))}
        {!reviews.length && <p className="text-sm text-slate-500">{t("empty")}</p>}
      </div>
    </div>
  );
}
