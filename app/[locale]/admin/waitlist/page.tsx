import { createAdminClient } from "@/lib/supabase/server";
import { formatDate } from "@/lib/utils";

export default async function AdminWaitlistPage() {
  const supabase = await createAdminClient();

  const { data: entries } = await supabase
    .from("waitlist")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(300);

  const { data: courses } = await supabase.from("courses").select("id, title_uz");
  const courseById = new Map((courses ?? []).map((c) => [c.id, c.title_uz]));

  return (
    <div>
      <h1 className="text-2xl font-bold text-white">Kutish ro&apos;yxati</h1>
      <p className="mt-1 text-sm text-slate-500">
        Hali ochilmagan kurslarga qiziqish bildirgan foydalanuvchilar.
      </p>

      <div className="mt-6 overflow-x-auto">
        <table className="w-full min-w-[600px] border-collapse text-sm">
          <thead>
            <tr className="border-b border-slate-800 text-left text-slate-400">
              <th className="py-2 pr-4">Sana</th>
              <th className="py-2 pr-4">Kurs</th>
              <th className="py-2 pr-4">Email</th>
              <th className="py-2 pr-4">Telefon</th>
            </tr>
          </thead>
          <tbody>
            {(entries ?? []).map((e) => (
              <tr key={e.id} className="border-b border-slate-900">
                <td className="py-3 pr-4 text-slate-400">
                  {formatDate(e.created_at)}
                </td>
                <td className="py-3 pr-4 text-white">{courseById.get(e.course_id) ?? "—"}</td>
                <td className="py-3 pr-4 text-slate-300">{e.email}</td>
                <td className="py-3 pr-4 text-slate-400">{e.phone ?? "—"}</td>
              </tr>
            ))}
            {!entries?.length && (
              <tr>
                <td colSpan={4} className="py-8 text-center text-slate-500">
                  Hozircha yozuvlar yo&apos;q
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
