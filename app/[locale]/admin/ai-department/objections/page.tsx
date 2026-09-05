import { listObjections, getAgentNameMap } from "@/lib/ai-department/data-actions";

export default async function ObjectionsPage() {
  const [objections, agentNames] = await Promise.all([listObjections(), getAgentNameMap()]);

  if (objections.length === 0) {
    return <p className="text-sm text-slate-500">Hozircha e&apos;tiroz javoblari yo&apos;q.</p>;
  }

  return (
    <div className="flex flex-col gap-3">
      {objections.map((o) => (
        <div key={o.id} className="rounded-xl border border-slate-800 bg-slate-900 p-4">
          <div className="flex items-start justify-between gap-2">
            <h3 className="min-w-0 flex-1 break-words text-base font-semibold text-white">
              &quot;{o.objection_text}&quot;
            </h3>
            {o.agent_key && (
              <span className="shrink-0 text-xs text-slate-600">{agentNames[o.agent_key] ?? o.agent_key}</span>
            )}
          </div>
          <p className="mt-2 text-sm whitespace-pre-wrap break-words text-slate-300">{o.empathetic_response}</p>
          {o.clarification && (
            <p className="mt-2 text-sm whitespace-pre-wrap break-words text-slate-400">
              <span className="font-medium text-amber-400">Aniqlashtirish:</span> {o.clarification}
            </p>
          )}
          {o.value_explanation && (
            <p className="mt-2 text-sm whitespace-pre-wrap break-words text-slate-400">
              <span className="font-medium text-amber-400">Qiymat tushuntirish:</span> {o.value_explanation}
            </p>
          )}
          {o.suggested_offer && (
            <p className="mt-2 text-sm whitespace-pre-wrap break-words text-slate-400">
              <span className="font-medium text-amber-400">Taklif:</span> {o.suggested_offer}
            </p>
          )}
        </div>
      ))}
    </div>
  );
}
