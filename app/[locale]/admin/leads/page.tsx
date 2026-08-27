import { createAdminClient } from "@/lib/supabase/server";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";
import { formatDateTime } from "@/lib/utils";
import {
  updateLeadStatus,
  addOperatorCallNote,
  upgradeToVipWithCredit,
} from "@/lib/lms/admin-actions";

const PAGE_SIZE = 25;

const LEAD_STATUS_LABELS: Record<string, string> = {
  new_lead: "Qiziqdi (New Lead)",
  vip_offered: "VIP Kurs Taklif Qilindi",
  downsell_subscribed: "Downsell → Obuna Sotib Oldi",
};

export default async function AdminLeadsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const { page: pageParam } = await searchParams;
  const page = Math.max(1, Number(pageParam) || 1);
  const from = (page - 1) * PAGE_SIZE;
  const to = from + PAGE_SIZE - 1;

  const admin = await createAdminClient();

  const {
    data: profiles,
    count: totalStudents,
  } = await admin
    .from("profiles")
    .select("*", { count: "exact" })
    .eq("role", "student")
    .order("created_at", { ascending: false })
    .range(from, to);

  const profileIds = (profiles ?? []).map((p) => p.id);

  const { data: subscriptions } = profileIds.length
    ? await admin
        .from("subscriptions")
        .select("user_id, status, current_period_end")
        .eq("status", "active")
        .in("user_id", profileIds)
    : { data: [] };
  const subByUser = new Map((subscriptions ?? []).map((s) => [s.user_id, s]));

  const { data: enrollments } = profileIds.length
    ? await admin.from("enrollments").select("user_id, course_id").in("user_id", profileIds)
    : { data: [] };
  const vipCountByUser = new Map<string, number>();
  for (const e of enrollments ?? []) {
    vipCountByUser.set(e.user_id, (vipCountByUser.get(e.user_id) ?? 0) + 1);
  }

  const { data: courses } = await admin
    .from("courses")
    .select("id, title_uz")
    .eq("is_published", true)
    .order("order_index", { ascending: true });

  const { data: callLogs } = profileIds.length
    ? await admin
        .from("operator_call_logs")
        .select("*")
        .in("user_id", profileIds)
        .order("created_at", { ascending: false })
    : { data: [] };
  const logsByUser = new Map<string, typeof callLogs>();
  for (const log of callLogs ?? []) {
    const list = logsByUser.get(log.user_id) ?? [];
    list.push(log);
    logsByUser.set(log.user_id, list);
  }

  const now = new Date().getTime();
  const totalPages = Math.max(1, Math.ceil((totalStudents ?? 0) / PAGE_SIZE));

  return (
    <div>
      <h1 className="text-2xl font-bold text-white">Mijozlar (CRM)</h1>
      <p className="mt-1 text-sm text-slate-500">
        Har bir foydalanuvchi bo&apos;yicha lid statusi, qo&apos;ng&apos;iroq tarixi va
        obunadan VIP kursga o&apos;tkazish (downsell) imkoniyati.
      </p>

      <div className="mt-6 space-y-3">
        {(profiles ?? []).map((profile) => {
          const sub = subByUser.get(profile.id);
          const daysLeft = sub
            ? Math.ceil((new Date(sub.current_period_end).getTime() - now) / (24 * 60 * 60 * 1000))
            : null;
          const expiringSoon = daysLeft !== null && daysLeft <= 3;
          const vipCount = vipCountByUser.get(profile.id) ?? 0;
          const logs = logsByUser.get(profile.id) ?? [];

          return (
            <details key={profile.id} className="rounded-lg border border-slate-800 p-4">
              <summary className="flex cursor-pointer flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="text-white">
                    {profile.full_name || "—"}{" "}
                    <span className="text-slate-500">{profile.phone ?? ""}</span>
                  </p>
                  <div className="mt-1 flex flex-wrap items-center gap-2 text-xs">
                    <Badge variant="outline">{LEAD_STATUS_LABELS[profile.lead_status]}</Badge>
                    {sub ? (
                      <Badge variant={expiringSoon ? "outline" : "default"}>
                        {expiringSoon
                          ? `Obuna tugashiga ${Math.max(daysLeft ?? 0, 0)} kun qoldi`
                          : "Obuna faol"}
                      </Badge>
                    ) : (
                      <span className="text-slate-500">Obuna yo&apos;q</span>
                    )}
                    {vipCount > 0 && <Badge>{vipCount} VIP kurs</Badge>}
                  </div>
                </div>
              </summary>

              <div className="mt-4 space-y-6 border-t border-slate-800 pt-4">
                <div className="flex flex-wrap items-center gap-2">
                  {Object.entries(LEAD_STATUS_LABELS).map(([value, label]) => (
                    <form key={value} action={updateLeadStatus.bind(null, profile.id, value)}>
                      <button
                        type="submit"
                        disabled={profile.lead_status === value}
                        className="rounded-full border border-slate-700 px-3 py-1 text-xs text-slate-300 hover:border-amber-500/50 disabled:cursor-not-allowed disabled:border-amber-500 disabled:text-amber-400"
                      >
                        {label}
                      </button>
                    </form>
                  ))}
                </div>

                {sub && (
                  <div>
                    <h3 className="text-sm font-semibold text-white">
                      Upgrade to VIP with Subscription Credit
                    </h3>
                    <p className="mt-1 text-xs text-slate-500">
                      Mijoz obuna to&apos;lovini (oxirgi to&apos;lov summasi) tanlangan VIP kurs
                      narxidan avtomatik ayiradi va kursga darhol VIP kirish beradi.
                    </p>
                    <form
                      action={upgradeToVipWithCredit.bind(null, profile.id)}
                      className="mt-2 flex flex-wrap gap-2"
                    >
                      <select
                        name="courseId"
                        required
                        className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500"
                      >
                        {(courses ?? []).map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.title_uz}
                          </option>
                        ))}
                      </select>
                      <Button type="submit" variant="outline" size="sm">
                        Kredit bilan VIP&apos;ga o&apos;tkazish
                      </Button>
                    </form>
                  </div>
                )}

                <div>
                  <h3 className="text-sm font-semibold text-white">Operator Call Log</h3>
                  <div className="mt-2 space-y-2">
                    {logs.map((log) => (
                      <div key={log.id} className="rounded-lg bg-slate-900/60 p-3 text-sm">
                        <p className="text-slate-200">{log.note}</p>
                        <p className="mt-1 text-xs text-slate-500">{formatDateTime(log.created_at)}</p>
                      </div>
                    ))}
                    {!logs.length && (
                      <p className="text-xs text-slate-500">Hozircha eslatma yo&apos;q.</p>
                    )}
                  </div>
                  <form
                    action={addOperatorCallNote.bind(null, profile.id)}
                    className="mt-3 flex flex-wrap gap-2"
                  >
                    <input
                      name="note"
                      required
                      placeholder="Qo'ng'iroq haqida eslatma..."
                      className="min-w-[240px] flex-1 rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white placeholder:text-slate-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500"
                    />
                    <Button type="submit" variant="outline" size="sm">
                      Qo&apos;shish
                    </Button>
                  </form>
                </div>
              </div>
            </details>
          );
        })}
        {!profiles?.length && (
          <p className="text-sm text-slate-500">Hozircha foydalanuvchilar yo&apos;q.</p>
        )}
      </div>

      {totalPages > 1 && (
        <div className="mt-6 flex items-center justify-between text-sm">
          {page > 1 ? (
            <Button asChild variant="outline" size="sm">
              <Link href={`/admin/leads?page=${page - 1}`}>← Oldingi</Link>
            </Button>
          ) : (
            <span />
          )}
          <span className="text-slate-500">
            Sahifa {page} / {totalPages}
          </span>
          {page < totalPages ? (
            <Button asChild variant="outline" size="sm">
              <Link href={`/admin/leads?page=${page + 1}`}>Keyingi →</Link>
            </Button>
          ) : (
            <span />
          )}
        </div>
      )}
    </div>
  );
}
