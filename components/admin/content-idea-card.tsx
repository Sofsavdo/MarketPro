"use client";

import { useTransition } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { updateContentIdeaStatus } from "@/lib/ai-department/data-actions";
import type { Database } from "@/lib/supabase/types";

type ContentIdea = Database["public"]["Tables"]["ai_content_ideas"]["Row"];
type Status = ContentIdea["status"];

const STATUS_LABELS: Record<Status, string> = {
  idea: "G'oya",
  draft: "Qoralama",
  review: "Ko'rib chiqilmoqda",
  approved: "Tasdiqlandi",
  published: "Joylandi",
};

const NEXT_STATUS: Record<Status, Status | null> = {
  idea: "draft",
  draft: "review",
  review: "approved",
  approved: "published",
  published: null,
};

export function ContentIdeaCard({ idea, brandLabel }: { idea: ContentIdea; brandLabel: string }) {
  const [isPending, startTransition] = useTransition();
  const next = NEXT_STATUS[idea.status];

  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900 p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Badge variant="outline">{brandLabel}</Badge>
          {idea.pillar && <Badge variant="outline">{idea.pillar}</Badge>}
          <span className="text-xs text-slate-500">{STATUS_LABELS[idea.status]}</span>
        </div>
        {next && (
          <Button
            size="sm"
            variant="outline"
            disabled={isPending}
            onClick={() => startTransition(() => updateContentIdeaStatus(idea.id, next))}
          >
            {STATUS_LABELS[next]}ga o&apos;tkazish
          </Button>
        )}
      </div>
      <h3 className="mt-2 text-base font-semibold text-white">{idea.title}</h3>
      {idea.hook && <p className="mt-1 text-sm text-amber-400">Hook: {idea.hook}</p>}
      {idea.body && <p className="mt-2 text-sm whitespace-pre-wrap text-slate-300">{idea.body}</p>}
      {idea.scheduled_for && (
        <p className="mt-2 text-xs text-slate-500">Rejalashtirilgan sana: {idea.scheduled_for}</p>
      )}
    </div>
  );
}
