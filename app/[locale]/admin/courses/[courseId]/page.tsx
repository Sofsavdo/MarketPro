import { notFound } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/server";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { updateCourse } from "@/lib/lms/admin-actions";

export default async function AdminCourseEditPage({
  params,
}: {
  params: Promise<{ courseId: string }>;
}) {
  const { courseId } = await params;
  const supabase = await createAdminClient();
  const { data: course } = await supabase
    .from("courses")
    .select("*")
    .eq("id", courseId)
    .maybeSingle();
  if (!course) notFound();

  const { data: moduleRows } = await supabase
    .from("modules")
    .select("*")
    .eq("course_id", course.id)
    .order("order_index", { ascending: true });
  const { data: lessonRows } = await supabase
    .from("lessons")
    .select("*")
    .eq("course_id", course.id)
    .order("order_index", { ascending: true });

  const modules = (moduleRows ?? []).map((mod) => ({
    ...mod,
    lessons: (lessonRows ?? []).filter((l) => l.module_id === mod.id),
  }));

  const updateCourseWithId = updateCourse.bind(null, course.id);

  return (
    <div>
      <h1 className="text-2xl font-bold text-white">{course.title_uz}</h1>

      <form action={updateCourseWithId} className="mt-8 max-w-2xl space-y-6">
        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="Nomi (UZ)" name="title_uz" defaultValue={course.title_uz} />
          <Field label="Nomi (RU)" name="title_ru" defaultValue={course.title_ru} />
          <Field label="Nomi (EN)" name="title_en" defaultValue={course.title_en} />
        </div>
        <div className="grid gap-4 sm:grid-cols-3">
          <Field
            label="Tavsif (UZ)"
            name="description_uz"
            defaultValue={course.description_uz}
            textarea
          />
          <Field
            label="Tavsif (RU)"
            name="description_ru"
            defaultValue={course.description_ru}
            textarea
          />
          <Field
            label="Tavsif (EN)"
            name="description_en"
            defaultValue={course.description_en}
            textarea
          />
        </div>
        <div className="grid gap-4 sm:grid-cols-4">
          <Field
            label="Muddat (oy)"
            name="duration_months"
            type="number"
            defaultValue={String(course.duration_months)}
          />
          <Field
            label="Start narxi"
            name="price_start"
            type="number"
            defaultValue={String(course.price_start)}
          />
          <Field
            label="Standard narxi"
            name="price_standard"
            type="number"
            defaultValue={String(course.price_standard)}
          />
          <Field
            label="Pro narxi"
            name="price_pro"
            type="number"
            defaultValue={String(course.price_pro)}
          />
        </div>
        <Button type="submit">Saqlash</Button>
      </form>

      <h2 className="mt-12 text-xl font-semibold text-white">Modul va darslar</h2>
      <div className="mt-4 space-y-6">
        {modules.map((mod, mi) => (
          <div key={mod.id}>
            <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
              {mi + 1}. {mod.title_uz}
            </h3>
            <div className="mt-2 space-y-1">
              {mod.lessons.map((lesson) => (
                <Link
                  key={lesson.id}
                  href={`/admin/lessons/${lesson.id}`}
                  className="flex items-center justify-between rounded-lg border border-slate-800 px-4 py-2 text-sm text-slate-300 hover:border-amber-500/50"
                >
                  <span>{lesson.title_uz}</span>
                  <span className="text-slate-500">
                    {lesson.video_url ? "🎬" : "—"} {lesson.is_free_preview ? "· bepul" : ""}
                  </span>
                </Link>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function Field({
  label,
  name,
  defaultValue,
  type = "text",
  textarea = false,
}: {
  label: string;
  name: string;
  defaultValue?: string;
  type?: string;
  textarea?: boolean;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={name}>{label}</Label>
      {textarea ? (
        <textarea
          id={name}
          name={name}
          defaultValue={defaultValue}
          rows={3}
          className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white placeholder:text-slate-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500"
        />
      ) : (
        <Input id={name} name={name} type={type} defaultValue={defaultValue} />
      )}
    </div>
  );
}
