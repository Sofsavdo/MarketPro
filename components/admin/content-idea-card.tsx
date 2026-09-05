"use client";

import { useTransition } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { updateContentIdeaStatus } from "@/lib/ai-department/data-actions";
import type { Database } from "@/lib/supabase/types";

type ContentIdea = Database["public"]["Tables"]["ai_content_ideas"]["Row"] & {
  scripts: Database["public"]["Tables"]["ai_scripts"]["Row"][];
};
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

const SCORE_LABELS: { key: keyof ContentIdea; label: string }[] = [
  { key: "score_value", label: "Foyda" },
  { key: "score_hook", label: "Hook" },
  { key: "score_retention", label: "Retention" },
  { key: "score_shareability", label: "Ulashish" },
  { key: "score_saveability", label: "Saqlash" },
  { key: "score_brand_fit", label: "Brendga mos" },
  { key: "score_originality", label: "Originallik" },
  { key: "score_conversion", label: "Konversiya" },
];

function averageScore(idea: ContentIdea): number | null {
  const values = SCORE_LABELS.map(({ key }) => idea[key] as number | null).filter(
    (v): v is number => typeof v === "number",
  );
  if (values.length === 0) return null;
  return Math.round((values.reduce((a, b) => a + b, 0) / values.length) * 10) / 10;
}

export function ContentIdeaCard({
  idea,
  brandLabel,
  agentName,
}: {
  idea: ContentIdea;
  brandLabel: string;
  agentName?: string;
}) {
  const [isPending, startTransition] = useTransition();
  const next = NEXT_STATUS[idea.status];
  const avg = averageScore(idea);

  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900 p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="outline">{brandLabel}</Badge>
          {idea.pillar && <Badge variant="outline">{idea.pillar}</Badge>}
          <span className="text-xs text-slate-500">{STATUS_LABELS[idea.status]}</span>
          {agentName && <span className="text-xs text-slate-600">· {agentName}</span>}
          {avg !== null && (
            <span
              className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                avg >= 7 ? "bg-emerald-500/15 text-emerald-400" : "bg-amber-500/15 text-amber-400"
              }`}
              title={SCORE_LABELS.map(({ key, label }) => `${label}: ${idea[key] ?? "-"}`).join(", ")}
            >
              Score: {avg}/10
            </span>
          )}
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
      <h3 className="mt-2 text-base font-semibold break-words text-white">{idea.title}</h3>
      {idea.hook && (
        <p className="mt-1 text-sm break-words text-amber-400">
          Hook: <span className="whitespace-pre-wrap">{idea.hook}</span>
        </p>
      )}
      {idea.body && <p className="mt-2 text-sm whitespace-pre-wrap break-words text-slate-300">{idea.body}</p>}
      {idea.scheduled_for && (
        <p className="mt-2 text-xs text-slate-500">Rejalashtirilgan sana: {idea.scheduled_for}</p>
      )}
      {idea.scripts.length > 0 && (
        <div className="mt-3 flex flex-col gap-2 border-t border-slate-800 pt-3">
          {idea.scripts.map((s) => (
            <details key={s.id} className="rounded-lg bg-slate-950 p-3">
              <summary className="cursor-pointer text-xs font-medium text-amber-400">
                Ishlab chiqarish materiali ko&apos;rish
              </summary>
              {s.script && (
                <p className="mt-2 text-sm whitespace-pre-wrap break-words text-slate-300">{s.script}</p>
              )}
              {s.caption && (
                <p className="mt-2 text-xs whitespace-pre-wrap break-words text-slate-400">
                  <span className="font-medium text-slate-300">Caption:</span> {s.caption}
                </p>
              )}
              {s.cta && (
                <p className="mt-1 text-xs whitespace-pre-wrap break-words text-slate-400">
                  <span className="font-medium text-slate-300">CTA:</span> {s.cta}
                </p>
              )}
              {s.direction_notes && (
                <p className="mt-1 text-xs whitespace-pre-wrap break-words text-slate-400">
                  <span className="font-medium text-slate-300">Rejissor ko&apos;rsatmasi:</span>{" "}
                  {s.direction_notes}
                </p>
              )}
            </details>
          ))}
        </div>
      )}
    </div>
  );
}
