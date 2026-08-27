import { createAdminClient } from "@/lib/supabase/server";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createLiveSession, deleteLiveSession } from "@/lib/lms/admin-actions";
import { formatDateTime } from "@/lib/utils";

export default async function AdminLiveSessionsPage() {
  const supabase = await createAdminClient();

  const { data: sessions } = await supabase
    .from("live_sessions")
    .select("*")
    .order("scheduled_at", { ascending: false });

  const { data: courses } = await supabase
    .from("courses")
    .select("id, title_uz")
    .eq("is_published", true)
    .order("order_index", { ascending: true });

  const courseById = new Map((courses ?? []).map((c) => [c.id, c.title_uz]));

  return (
    <div>
      <h1 className="text-2xl font-bold text-white">Jonli darslar (Google Meet)</h1>
      <p className="mt-1 text-sm text-slate-500">
        Kursni Standart yoki Pro tarifda sotib olgan talabalar uchun jadval bo&apos;yicha guruh
        darslari — obunachilar va Start tarifidagilar live darsga kirolmaydi, lekin jadvalni
        ko&apos;radi. Google Meet havolasini{" "}
        <a
          href="https://meet.google.com/new"
          target="_blank"
          rel="noreferrer"
          className="text-amber-400 hover:underline"
        >
          meet.google.com/new
        </a>{" "}
        orqali yarating va shu yerga joylang.
      </p>

      <details className="mt-6 rounded-lg border border-slate-800 p-4">
        <summary className="cursor-pointer text-sm font-medium text-amber-400">
          + Yangi dars qo&apos;shish
        </summary>
        <form action={createLiveSession} className="mt-4 max-w-xl space-y-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="course_id">Kurs</Label>
            <select
              id="course_id"
              name="course_id"
              required
              className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500"
            >
              {(courses ?? []).map((c) => (
                <option key={c.id} value={c.id}>
                  {c.title_uz}
                </option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="title">Dars mavzusi</Label>
            <Input id="title" name="title" required />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="meet_url">Google Meet havolasi</Label>
            <Input id="meet_url" name="meet_url" placeholder="https://meet.google.com/xxx-xxxx-xxx" required />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="required_tier">Qaysi tarif kira oladi</Label>
            <select
              id="required_tier"
              name="required_tier"
              defaultValue="standard"
              className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500"
            >
              <option value="standard">Standart va Pro</option>
              <option value="pro">Faqat Pro</option>
            </select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="scheduled_date">Sana</Label>
              <Input id="scheduled_date" name="scheduled_date" type="date" required />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="scheduled_time">Vaqt (Toshkent bo&apos;yicha)</Label>
              <Input id="scheduled_time" name="scheduled_time" type="time" required />
            </div>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="duration_minutes">Davomiyligi (daqiqa)</Label>
            <Input id="duration_minutes" name="duration_minutes" type="number" defaultValue="60" />
          </div>
          <Button type="submit">Qo&apos;shish</Button>
        </form>
      </details>

      <div className="mt-8 overflow-x-auto">
        <table className="w-full min-w-[760px] border-collapse text-sm">
          <thead>
            <tr className="border-b border-slate-800 text-left text-slate-400">
              <th className="py-2 pr-4">Sana/vaqt</th>
              <th className="py-2 pr-4">Kurs</th>
              <th className="py-2 pr-4">Mavzu</th>
              <th className="py-2 pr-4">Tarif</th>
              <th className="py-2 pr-4"></th>
            </tr>
          </thead>
          <tbody>
            {(sessions ?? []).map((s) => (
              <tr key={s.id} className="border-b border-slate-900">
                <td className="py-3 pr-4 text-slate-300">
                  {formatDateTime(s.scheduled_at)}
                </td>
                <td className="py-3 pr-4 text-white">{courseById.get(s.course_id) ?? "—"}</td>
                <td className="py-3 pr-4 text-slate-300">{s.title}</td>
                <td className="py-3 pr-4 text-slate-300">
                  {s.required_tier === "pro" ? "Faqat Pro" : "Standart+"}
                </td>
                <td className="py-3 pr-4">
                  <div className="flex items-center gap-3">
                    <Link href={`/admin/live-sessions/${s.id}`} className="text-amber-400 hover:underline">
                      Savollar
                    </Link>
                    <form action={deleteLiveSession.bind(null, s.id)}>
                      <button type="submit" className="text-red-400 hover:underline">
                        O&apos;chirish
                      </button>
                    </form>
                  </div>
                </td>
              </tr>
            ))}
            {!sessions?.length && (
              <tr>
                <td colSpan={5} className="py-8 text-center text-slate-500">
                  Hozircha dars rejalashtirilmagan
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
