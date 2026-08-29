import { createAdminClient } from "@/lib/supabase/server";
import { Link } from "@/i18n/navigation";
import { Badge } from "@/components/ui/badge";
import { PublishToggle } from "@/components/admin/publish-toggle";
import { ScrollFadeX } from "@/components/admin/scroll-fade-x";
import { formatSom } from "@/lib/utils";

export default async function AdminCoursesPage() {
  const supabase = await createAdminClient();
  const { data: courses } = await supabase
    .from("courses")
    .select("*")
    .order("order_index", { ascending: true });

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold text-white">Kurslar</h1>
        <Link
          href="/admin/courses/new"
          className="rounded-lg bg-amber-500 px-4 py-2 text-sm font-semibold text-slate-950 hover:bg-amber-400"
        >
          + Yangi kurs
        </Link>
      </div>
      <div className="mt-6">
       <ScrollFadeX>
        <table className="w-full min-w-[720px] border-collapse text-sm">
          <thead>
            <tr className="border-b border-slate-800 text-left text-slate-400">
              <th className="py-2 pr-4">Nomi</th>
              <th className="py-2 pr-4">Narxlar (Start / Standart / Pro)</th>
              <th className="py-2 pr-4">Holat</th>
              <th className="py-2 pr-4"></th>
            </tr>
          </thead>
          <tbody>
            {(courses ?? []).map((course) => (
              <tr key={course.id} className="border-b border-slate-900">
                <td className="py-3 pr-4 text-white">{course.title_uz}</td>
                <td className="py-3 pr-4 text-slate-400">
                  {formatSom(course.price_start)} / {formatSom(course.price_standard)} /{" "}
                  {formatSom(course.price_pro)}
                </td>
                <td className="py-3 pr-4">
                  <Badge variant={course.is_published ? "default" : "outline"}>
                    {course.is_published ? "Chop etilgan" : "Qoralama"}
                  </Badge>
                </td>
                <td className="py-3 pr-4">
                  <div className="flex items-center gap-3">
                    <Link href={`/admin/courses/${course.id}`} className="text-amber-400 hover:underline">
                      Tahrirlash
                    </Link>
                    <PublishToggle courseId={course.id} isPublished={course.is_published} />
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
       </ScrollFadeX>
      </div>
    </div>
  );
}
