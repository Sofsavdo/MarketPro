import { createAdminClient } from "@/lib/supabase/server";
import { Badge } from "@/components/ui/badge";
import { formatSom, formatDate } from "@/lib/utils";
import { refundPayment } from "@/lib/lms/admin-actions";

export default async function AdminPaymentsPage() {
  const supabase = await createAdminClient();

  const { data: payments } = await supabase
    .from("payments")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(200);

  const { data: courses } = await supabase.from("courses").select("id, title_uz");
  const courseById = new Map((courses ?? []).map((c) => [c.id, c.title_uz]));

  const paid = (payments ?? []).filter((p) => p.status === "paid");
  const totalRevenue = paid.reduce((sum, p) => sum + p.amount, 0);

  const statusVariant = {
    paid: "default",
    pending: "outline",
    failed: "outline",
    refunded: "outline",
  } as const;

  return (
    <div>
      <h1 className="text-2xl font-bold text-white">To&apos;lovlar</h1>

      <div className="mt-6 grid gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-slate-800 p-5">
          <p className="text-sm text-slate-400">Jami tushum (paid)</p>
          <p className="mt-1 text-2xl font-bold text-amber-500">{formatSom(totalRevenue)}</p>
        </div>
        <div className="rounded-xl border border-slate-800 p-5">
          <p className="text-sm text-slate-400">To&apos;langan tranzaksiyalar</p>
          <p className="mt-1 text-2xl font-bold text-white">{paid.length}</p>
        </div>
        <div className="rounded-xl border border-slate-800 p-5">
          <p className="text-sm text-slate-400">Jami tranzaksiyalar</p>
          <p className="mt-1 text-2xl font-bold text-white">{payments?.length ?? 0}</p>
        </div>
      </div>

      <div className="mt-8 overflow-x-auto">
        <table className="w-full min-w-[860px] border-collapse text-sm">
          <thead>
            <tr className="border-b border-slate-800 text-left text-slate-400">
              <th className="py-2 pr-4">Sana</th>
              <th className="py-2 pr-4">Provayder</th>
              <th className="py-2 pr-4">Kurs / Obuna</th>
              <th className="py-2 pr-4">Chegirma</th>
              <th className="py-2 pr-4">Summa</th>
              <th className="py-2 pr-4">Holat</th>
              <th className="py-2 pr-4"></th>
            </tr>
          </thead>
          <tbody>
            {(payments ?? []).map((p) => (
              <tr key={p.id} className="border-b border-slate-900">
                <td className="py-3 pr-4 text-slate-400">
                  {formatDate(p.created_at)}
                </td>
                <td className="py-3 pr-4 capitalize text-slate-300">{p.provider}</td>
                <td className="py-3 pr-4 text-white">
                  {p.course_id ? (courseById.get(p.course_id) ?? "—") : `Obuna (${p.subscription_plan})`}
                </td>
                <td className="py-3 pr-4 text-slate-400">
                  {p.discount_amount > 0 ? `-${formatSom(p.discount_amount)}` : "—"}
                </td>
                <td className="py-3 pr-4 text-white">{formatSom(p.amount)}</td>
                <td className="py-3 pr-4">
                  <Badge variant={statusVariant[p.status]}>{p.status}</Badge>
                </td>
                <td className="py-3 pr-4">
                  {p.status === "paid" && (
                    <form action={refundPayment.bind(null, p.id)}>
                      <button type="submit" className="text-red-400 hover:underline">
                        Qaytarish
                      </button>
                    </form>
                  )}
                </td>
              </tr>
            ))}
            {!payments?.length && (
              <tr>
                <td colSpan={7} className="py-8 text-center text-slate-500">
                  Hozircha to&apos;lovlar yo&apos;q
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
