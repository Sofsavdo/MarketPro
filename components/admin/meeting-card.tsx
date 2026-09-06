"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";

type Contribution = { agent_key: string; agent_name: string; text: string };

export function MeetingCard({
  weekStart,
  summary,
  contributions,
}: {
  weekStart: string;
  summary: string | null;
  contributions: Contribution[];
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900 p-4">
      <p className="text-xs font-semibold text-amber-400">{weekStart} haftasi</p>
      {summary && <p className="mt-2 text-sm whitespace-pre-wrap break-words text-slate-300">{summary}</p>}
      {contributions.length > 0 && (
        <div className="mt-3 border-t border-slate-800 pt-2">
          <button
            onClick={() => setOpen((v) => !v)}
            className="flex items-center gap-1 text-xs text-slate-500 hover:text-slate-300"
          >
            <ChevronDown className={`h-3.5 w-3.5 transition-transform ${open ? "rotate-180" : ""}`} />
            {contributions.length} ta mutaxassis o&apos;z fikrini bildirdi
          </button>
          {open && (
            <div className="mt-2 grid gap-3 sm:grid-cols-2">
              {contributions.map((c) => (
                <div key={c.agent_key} className="rounded-lg border border-slate-800 bg-slate-800/40 p-3">
                  <p className="text-xs font-semibold text-slate-300">{c.agent_name}</p>
                  <p className="mt-1 text-xs whitespace-pre-wrap break-words text-slate-400">{c.text}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
