import { createAdminClient } from "@/lib/supabase/server";
import { formatSom, APP_TIME_ZONE } from "@/lib/utils";
import { Users, Wallet, TrendingUp, Clock, Star, AlertTriangle } from "lucide-react";

// Every number here is computed live from the same tables the rest of the
// admin panel (CRM, installments, payments, reviews) reads/writes — this
// page exists to answer "how is the business doing" in one glance instead
// of an admin mentally aggregating four separate list pages themselves.
export default async function AdminAnalyticsPage() {
  const admin = await createAdminClient();

  const nowIso = new Date().toISOString();
  // Tashkent-local calendar month start, expressed as a UTC instant — same
  // reasoning as todayInTashkent()/APP_TIME_ZONE elsewhere: the app only
  // serves Uzbekistan, so "this month" must mean Tashkent's calendar, not
  // whatever timezone the server process happens to run in.
  const nowInTashkent = new Date(new Date().toLocaleString("en-US", { timeZone: APP_TIME_ZONE }));
  const monthStart = new Date(Date.UTC(nowInTashkent.getFullYear(), nowInTashkent.getMonth(), 1) - 5 * 60 * 60 * 1000);

  const [
    { count: totalStudents },
    { count: activeSubscribers },
    { data: enrollmentUsers },
    { data: paidPayments },
    { data: monthPayments },
    { count: newLeads },
    { count: vipOfferedLeads },
    { count: downsellSubscribed },
    { count: installmentNew },
    { count: installmentContacted },
    { count: installmentConverted },
    { count: installmentDeclined },
    { data: openInstallmentLeads },
    { data: convertedInstallmentLeads },
    { count: overdueInstallments },
    { count: pendingReviews },
    { count: totalCourses },
    { count: publishedCourses },
  ] = await Promise.all([
    admin.from("profiles").select("id", { count: "exact", head: true }).eq("role", "student"),
    admin
      .from("subscriptions")
      .select("id", { count: "exact", head: true })
      .eq("status", "active")
      .gt("current_period_end", nowIso),
    admin.from("enrollments").select("user_id"),
    admin.from("payments").select("amount").eq("status", "paid"),
    admin.from("payments").select("amount").eq("status", "paid").gte("created_at", monthStart.toISOString()),
    admin.from("profiles").select("id", { count: "exact", head: true }).eq("lead_status", "new_lead"),
    admin.from("profiles").select("id", { count: "exact", head: true }).eq("lead_status", "vip_offered"),
    admin.from("profiles").select("id", { count: "exact", head: true }).eq("lead_status", "downsell_subscribed"),
    admin.from("installment_leads").select("id", { count: "exact", head: true }).eq("status", "new"),
    admin.from("installment_leads").select("id", { count: "exact", head: true }).eq("status", "contacted"),
    admin.from("installment_leads").select("id", { count: "exact", head: true }).eq("status", "converted"),
    admin.from("installment_leads").select("id", { count: "exact", head: true }).eq("status", "declined"),
    admin.from("installment_leads").select("total_amount").in("status", ["new", "contacted"]),
    admin.from("installment_leads").select("total_amount").eq("status", "converted"),
    admin
      .from("installment_payments")
      .select("id", { count: "exact", head: true })
      .eq("status", "pending")
      .lt("due_date", nowIso),
    admin.from("course_reviews").select("id", { count: "exact", head: true }).eq("status", "pending"),
    admin.from("courses").select("id", { count: "exact", head: true }),
    admin.from("courses").select("id", { count: "exact", head: true }).eq("is_published", true),
  ]);

  const uniqueBuyers = new Set((enrollmentUsers ?? []).map((e) => e.user_id)).size;
  const totalRevenue = (paidPayments ?? []).reduce((sum, p) => sum + p.amount, 0);
  const monthRevenue = (monthPayments ?? []).reduce((sum, p) => sum + p.amount, 0);
  const totalLeads = (newLeads ?? 0) + (vipOfferedLeads ?? 0) + (downsellSubscribed ?? 0);
  const funnelConversion = totalLeads > 0 ? Math.round(((downsellSubscribed ?? 0) / totalLeads) * 100) : 0;
  const openPipelineValue = (openInstallmentLeads ?? []).reduce((sum, l) => sum + l.total_amount, 0);
  const convertedPipelineValue = (convertedInstallmentLeads ?? []).reduce((sum, l) => sum + l.total_amount, 0);

  return (
    <div>
      <h1 className="text-2xl font-bold text-white">Statistika va sotuv voronkasi</h1>
      <p className="mt-1 text-sm text-slate-500">
        Barcha ko&apos;rsatkichlar real vaqtda — CRM, muddatli to&apos;lovlar va to&apos;lovlar
        jadvallaridan hisoblanadi.
      </p>

      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard icon={Users} label="Jami talabalar" value={String(totalStudents ?? 0)} />
        <StatCard icon={Users} label="Faol obunachilar" value={String(activeSubscribers ?? 0)} />
        <StatCard icon={Users} label="Kurs xaridorlari" value={String(uniqueBuyers)} />
        <StatCard icon={Wallet} label="Jami tushum" value={formatSom(totalRevenue)} accent />
        <StatCard icon={TrendingUp} label="Shu oy tushumi" value={formatSom(monthRevenue)} accent />
        <StatCard icon={Star} label="Tasdiq kutayotgan sharhlar" value={String(pendingReviews ?? 0)} />
        <StatCard
          icon={AlertTriangle}
          label="Muddati o'tgan to'lovlar"
          value={String(overdueInstallments ?? 0)}
          warn={!!overdueInstallments}
        />
        <StatCard icon={Clock} label="Nashr etilgan kurslar" value={`${publishedCourses ?? 0} / ${totalCourses ?? 0}`} />
      </div>

      <h2 className="mt-10 text-lg font-semibold text-white">Sotuv voronkasi (obuna → downsell)</h2>
      <p className="mt-1 text-sm text-slate-500">
        Har bir talaba lid holati (CRM sahifasida boshqariladi) bo&apos;yicha bosqichlar.
      </p>
      <div className="mt-4 overflow-hidden rounded-xl border border-slate-800">
        <FunnelRow label="Qiziqdi (New Lead)" count={newLeads ?? 0} total={totalLeads} />
        <FunnelRow label="VIP kurs taklif qilindi" count={vipOfferedLeads ?? 0} total={totalLeads} />
        <FunnelRow
          label="Obunadan VIP kursga o'tdi"
          count={downsellSubscribed ?? 0}
          total={totalLeads}
          last
        />
      </div>
      <p className="mt-3 text-sm text-slate-400">
        Umumiy konversiya: <span className="font-semibold text-amber-400">{funnelConversion}%</span>{" "}
        ({downsellSubscribed ?? 0}/{totalLeads} lid VIP kursga o&apos;tdi)
      </p>

      <h2 className="mt-10 text-lg font-semibold text-white">Muddatli to&apos;lov pipeline</h2>
      <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard icon={Clock} label="Yangi so'rovlar" value={String(installmentNew ?? 0)} />
        <StatCard icon={Clock} label="Bog'lanildi" value={String(installmentContacted ?? 0)} />
        <StatCard icon={TrendingUp} label="Rasmiylashtirildi" value={String(installmentConverted ?? 0)} />
        <StatCard icon={AlertTriangle} label="Rad etildi" value={String(installmentDeclined ?? 0)} />
      </div>
      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-4">
          <p className="text-sm text-slate-400">Ochiq pipeline qiymati (yangi + bog&apos;lanilgan)</p>
          <p className="mt-1 text-xl font-bold text-white">{formatSom(openPipelineValue)}</p>
        </div>
        <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-4">
          <p className="text-sm text-slate-400">Rasmiylashtirilgan (konvertatsiya qilingan) qiymat</p>
          <p className="mt-1 text-xl font-bold text-emerald-400">{formatSom(convertedPipelineValue)}</p>
        </div>
      </div>
    </div>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
  accent,
  warn,
}: {
  icon: typeof Users;
  label: string;
  value: string;
  accent?: boolean;
  warn?: boolean;
}) {
  return (
    <div
      className={`rounded-xl border p-4 ${
        warn ? "border-red-500/30 bg-red-500/5" : "border-slate-800 bg-slate-900/40"
      }`}
    >
      <div className="flex items-center gap-2 text-slate-400">
        <Icon className={`h-4 w-4 ${warn ? "text-red-400" : "text-amber-500"}`} />
        <p className="text-xs">{label}</p>
      </div>
      <p className={`mt-2 text-xl font-bold ${accent ? "text-amber-400" : warn ? "text-red-400" : "text-white"}`}>
        {value}
      </p>
    </div>
  );
}

function FunnelRow({
  label,
  count,
  total,
  last,
}: {
  label: string;
  count: number;
  total: number;
  last?: boolean;
}) {
  const pct = total > 0 ? Math.round((count / total) * 100) : 0;
  return (
    <div className={`flex items-center gap-4 bg-slate-900/40 px-4 py-3 ${!last ? "border-b border-slate-800" : ""}`}>
      <span className="w-56 shrink-0 truncate text-sm text-slate-300">{label}</span>
      <div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-800">
        <div className="h-full rounded-full bg-amber-500" style={{ width: `${pct}%` }} />
      </div>
      <span className="w-20 shrink-0 text-right text-sm font-medium text-white">
        {count} <span className="text-slate-500">({pct}%)</span>
      </span>
    </div>
  );
}
