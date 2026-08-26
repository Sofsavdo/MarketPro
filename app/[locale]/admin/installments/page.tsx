import { createAdminClient } from "@/lib/supabase/server";
import { Badge } from "@/components/ui/badge";
import { formatSom, formatDate } from "@/lib/utils";

export default async function AdminInstallmentsPage() {
  const supabase = await createAdminClient();

  const { data: plans } = await supabase
    .from("installment_plans")
    .select("*")
    .order("created_at", { ascending: false });

  const { data: courses } = await supabase.from("courses").select("id, title_uz");
  const courseById = new Map((courses ?? []).map((c) => [c.id, c.title_uz]));

  const { data: profiles } = await supabase.from("profiles").select("id, full_name, phone");
  const profileById = new Map((profiles ?? []).map((p) => [p.id, p]));

  const planIds = (plans ?? []).map((p) => p.id);
  const { data: allInstallments } = planIds.length
    ? await supabase
        .from("installment_payments")
        .select("*")
        .in("plan_id", planIds)
        .order("sequence_number", { ascending: true })
    : { data: [] };

  const installmentsByPlan = new Map<string, typeof allInstallments>();
  for (const ip of allInstallments ?? []) {
    const list = installmentsByPlan.get(ip.plan_id) ?? [];
    list.push(ip);
    installmentsByPlan.set(ip.plan_id, list);
  }

  const now = new Date();
  const totalOverdue = (allInstallments ?? []).filter(
    (ip) => ip.status === "pending" && new Date(ip.due_date) < now,
  ).length;

  return (
    <div>
      <h1 className="text-2xl font-bold text-white">Muddatli to&apos;lovlar</h1>
      <p className="mt-1 text-sm text-slate-500">
        {totalOverdue > 0
          ? `${totalOverdue} ta muddati o'tgan to'lov bor — talabalar bilan bog'laning.`
          : "Muddati o'tgan to'lov yo'q."}
      </p>

      <div className="mt-6 space-y-4">
        {(plans ?? []).map((plan) => {
          const installments = installmentsByPlan.get(plan.id) ?? [];
          const profile = profileById.get(plan.user_id);
          const paidCount = installments.filter((i) => i.status === "paid").length;

          return (
            <div key={plan.id} className="rounded-lg border border-slate-800 p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="text-white">
                    {profile?.full_name ?? plan.user_id.slice(0, 8)}{" "}
                    <span className="text-slate-500">— {courseById.get(plan.course_id)}</span>
                  </p>
                  <p className="text-xs text-slate-500">
                    {profile?.phone ?? "—"} · {plan.tier} · {plan.installments_count} bo&apos;lak
                  </p>
                </div>
                <Badge variant="outline">
                  {paidCount}/{installments.length} to&apos;langan
                </Badge>
              </div>

              <div className="mt-3 grid gap-2 sm:grid-cols-3">
                {installments.map((ip) => {
                  const overdue = ip.status === "pending" && new Date(ip.due_date) < now;
                  return (
                    <div
                      key={ip.id}
                      className={`rounded-md border p-2 text-xs ${
                        overdue
                          ? "border-red-500/40 bg-red-500/5 text-red-400"
                          : ip.status === "paid"
                            ? "border-emerald-500/30 bg-emerald-500/5 text-emerald-400"
                            : "border-slate-800 text-slate-400"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span>#{ip.sequence_number}</span>
                        <span>{formatSom(ip.amount)}</span>
                      </div>
                      <div className="mt-1">
                        {formatDate(ip.due_date)} —{" "}
                        {overdue ? "muddati o'tgan" : ip.status === "paid" ? "to'langan" : "kutilmoqda"}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}

        {!plans?.length && (
          <p className="py-8 text-center text-slate-500">Hozircha muddatli to&apos;lov yo&apos;q</p>
        )}
      </div>
    </div>
  );
}
