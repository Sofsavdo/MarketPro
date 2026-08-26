"use client";

import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { formatDateTime } from "@/lib/utils";
import type { Locale } from "@/i18n/routing";

type Comment = {
  id: string;
  comment: string;
  created_at: string;
  full_name: string | null;
};

export function LessonComments({
  comments,
  action,
  locale,
}: {
  comments: Comment[];
  action: (formData: FormData) => Promise<void>;
  locale: Locale;
}) {
  const t = useTranslations("course.comments");

  return (
    <div className="mt-10 border-t border-slate-800 pt-8">
      <h2 className="text-lg font-bold text-white">{t("title")}</h2>

      <form action={action} className="mt-4 flex flex-col gap-2 sm:flex-row">
        <textarea
          name="comment"
          rows={2}
          placeholder={t("placeholder")}
          className="min-w-0 flex-1 rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white placeholder:text-slate-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500"
        />
        <Button type="submit" size="sm" className="self-end sm:self-start">
          {t("submit")}
        </Button>
      </form>

      <div className="mt-6 space-y-3">
        {comments.map((c) => (
          <div key={c.id} className="rounded-lg bg-slate-900/60 p-3 text-sm">
            <div className="flex items-center justify-between gap-2">
              <span className="font-medium text-slate-200">{c.full_name || t("anon")}</span>
              <span className="text-xs text-slate-500">{formatDateTime(c.created_at, locale)}</span>
            </div>
            <p className="mt-1 text-slate-400">{c.comment}</p>
          </div>
        ))}
        {!comments.length && <p className="text-sm text-slate-500">{t("empty")}</p>}
      </div>
    </div>
  );
}
