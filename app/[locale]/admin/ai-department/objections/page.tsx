import { listObjections } from "@/lib/ai-department/data-actions";

export default async function ObjectionsPage() {
  const objections = await listObjections();

  if (objections.length === 0) {
    return <p className="text-sm text-slate-500">Hozircha e&apos;tiroz javoblari yo&apos;q.</p>;
  }

  return (
    <div className="flex flex-col gap-3">
      {objections.map((o) => (
        <div key={o.id} className="rounded-xl border border-slate-800 bg-slate-900 p-4">
          <h3 className="text-base font-semibold text-white">&quot;{o.objection_text}&quot;</h3>
          <p className="mt-2 text-sm text-slate-300">{o.empathetic_response}</p>
          {o.clarification && (
            <p className="mt-2 text-sm text-slate-400">
              <span className="font-medium text-amber-400">Aniqlashtirish:</span> {o.clarification}
            </p>
          )}
          {o.value_explanation && (
            <p className="mt-2 text-sm text-slate-400">
              <span className="font-medium text-amber-400">Qiymat tushuntirish:</span> {o.value_explanation}
            </p>
          )}
          {o.suggested_offer && (
            <p className="mt-2 text-sm text-slate-400">
              <span className="font-medium text-amber-400">Taklif:</span> {o.suggested_offer}
            </p>
          )}
        </div>
      ))}
    </div>
  );
}
