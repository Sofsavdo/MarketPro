import { listReports, getAgentNameMap } from "@/lib/ai-department/data-actions";
import { Badge } from "@/components/ui/badge";

const PERIOD_LABELS: Record<string, string> = { weekly: "Haftalik", monthly: "Oylik" };

export default async function ReportsPage() {
  const [reports, agentNames] = await Promise.all([listReports(), getAgentNameMap()]);

  if (reports.length === 0) {
    return (
      <p className="text-sm text-slate-500">
        Hozircha hisobot yo&apos;q. Chat&apos;da &quot;Oxirgi 30 kunni analiz qil&quot; yoki &quot;Haftalik
        hisobot tuz&quot; deb so&apos;rang.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {reports.map((r) => {
        const content = r.content as {
          summary?: string;
          stop?: string | null;
          start?: string | null;
          continue_doing?: string | null;
        };
        return (
          <div key={r.id} className="rounded-xl border border-slate-800 bg-slate-900 p-4">
            <div className="flex items-center gap-2">
              <Badge variant="outline">{PERIOD_LABELS[r.period] ?? r.period}</Badge>
              <span className="text-xs text-slate-500">
                {r.period_start} — {r.period_end}
              </span>
              {r.agent_key && (
                <span className="text-xs text-slate-600">{agentNames[r.agent_key] ?? r.agent_key}</span>
              )}
            </div>
            {content.summary && <p className="mt-2 text-sm text-slate-300">{content.summary}</p>}
            <div className="mt-3 grid gap-3 border-t border-slate-800 pt-3 sm:grid-cols-3">
              {content.stop && (
                <div>
                  <p className="text-xs font-semibold text-red-400">STOP</p>
                  <p className="mt-1 text-xs text-slate-400">{content.stop}</p>
                </div>
              )}
              {content.start && (
                <div>
                  <p className="text-xs font-semibold text-emerald-400">START</p>
                  <p className="mt-1 text-xs text-slate-400">{content.start}</p>
                </div>
              )}
              {content.continue_doing && (
                <div>
                  <p className="text-xs font-semibold text-amber-400">CONTINUE</p>
                  <p className="mt-1 text-xs text-slate-400">{content.continue_doing}</p>
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
