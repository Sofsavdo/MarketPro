import { listCompetitorsWithNotes, getAgentNameMap } from "@/lib/ai-department/data-actions";
import { Badge } from "@/components/ui/badge";

export default async function CompetitorsPage() {
  const [competitors, agentNames] = await Promise.all([listCompetitorsWithNotes(), getAgentNameMap()]);

  if (competitors.length === 0) {
    return (
      <p className="text-sm text-slate-500">
        Hozircha raqobatchi tahlili yo&apos;q. Chat&apos;da &quot;Raqobatchilarni tekshir&quot; deb so&apos;rang.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {competitors.map((c) => (
        <div key={c.id} className="rounded-xl border border-slate-800 bg-slate-900 p-4">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-base font-semibold text-white">{c.name}</h3>
            <Badge variant="outline">{c.category}</Badge>
            {c.handle_or_url && (
              <a href={c.handle_or_url} target="_blank" rel="noreferrer" className="text-xs text-amber-400">
                {c.handle_or_url}
              </a>
            )}
          </div>
          {c.positioning && <p className="mt-1 text-sm text-slate-400">{c.positioning}</p>}
          <div className="mt-3 flex flex-col gap-2 border-t border-slate-800 pt-3">
            {c.notes.length === 0 ? (
              <p className="text-xs text-slate-600">Hali tahlil yozuvi yo&apos;q.</p>
            ) : (
              c.notes.map((n) => (
                <div key={n.id} className="text-sm text-slate-300">
                  <p>{n.summary}</p>
                  <p className="mt-0.5 text-xs text-slate-500">
                    {new Date(n.retrieved_at).toLocaleDateString("uz-UZ")}
                    {n.agent_key && <> · {agentNames[n.agent_key] ?? n.agent_key}</>}
                    {n.source_url && (
                      <>
                        {" · "}
                        <a href={n.source_url} target="_blank" rel="noreferrer" className="text-amber-500">
                          manba
                        </a>
                      </>
                    )}
                  </p>
                </div>
              ))
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
