import { notFound } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/server";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  updateCourse,
  createModule,
  deleteModule,
  moveModule,
  createLesson,
  deleteLesson,
  moveLesson,
} from "@/lib/lms/admin-actions";

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
        <Field
          label="Cover rasm URL"
          name="cover_url"
          defaultValue={course.cover_url ?? ""}
          placeholder="https://.../cover.jpg"
        />
        <div className="grid gap-4 sm:grid-cols-2">
          <Field
            label="Ustoz ismi (ixtiyoriy)"
            name="instructor_name"
            defaultValue={course.instructor_name ?? ""}
          />
          <Field
            label="Ustoz avatar URL (ixtiyoriy)"
            name="instructor_avatar_url"
            defaultValue={course.instructor_avatar_url ?? ""}
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
      <p className="mt-1 text-sm text-slate-500">
        Darslar shu yerdagi tartibda ketma-ket ochiladi — o&apos;quvchi avvalgi darsni
        (va agar test bo&apos;lsa, testni) tugatmasa keyingisiga o&apos;ta olmaydi.
      </p>
      <div className="mt-4 space-y-8">
        {modules.map((mod, mi) => {
          const moveModuleUp = moveModule.bind(null, mod.id, course.id, "up");
          const moveModuleDown = moveModule.bind(null, mod.id, course.id, "down");
          const deleteModuleWithId = deleteModule.bind(null, mod.id, course.id);
          const createLessonInModule = createLesson.bind(null, course.id, mod.id);

          return (
            <div key={mod.id} className="rounded-xl border border-slate-800 p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-300">
                  {mi + 1}. {mod.title_uz}
                </h3>
                <div className="flex items-center gap-3 text-xs text-slate-500">
                  <form action={moveModuleUp}>
                    <button type="submit" className="hover:text-white" disabled={mi === 0}>
                      ↑
                    </button>
                  </form>
                  <form action={moveModuleDown}>
                    <button
                      type="submit"
                      className="hover:text-white"
                      disabled={mi === modules.length - 1}
                    >
                      ↓
                    </button>
                  </form>
                  <form action={deleteModuleWithId}>
                    <button type="submit" className="text-red-400 hover:underline">
                      Modulni o&apos;chirish
                    </button>
                  </form>
                </div>
              </div>

              <div className="mt-3 space-y-1">
                {mod.lessons.map((lesson, li) => {
                  const moveLessonUp = moveLesson.bind(null, lesson.id, course.id, "up");
                  const moveLessonDown = moveLesson.bind(null, lesson.id, course.id, "down");
                  const deleteLessonWithId = deleteLesson.bind(null, lesson.id, course.id);

                  return (
                    <div
                      key={lesson.id}
                      className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-slate-800 px-4 py-2 text-sm text-slate-300 hover:border-amber-500/50"
                    >
                      <Link href={`/admin/lessons/${lesson.id}`} className="min-w-0 flex-1">
                        {li + 1}. {lesson.title_uz}{" "}
                        <span className="text-slate-500">
                          {lesson.video_url ? "🎬" : "📄"} {lesson.is_free_preview ? "· bepul" : ""}
                        </span>
                      </Link>
                      <div className="flex items-center gap-3 text-xs text-slate-500">
                        <form action={moveLessonUp}>
                          <button type="submit" className="hover:text-white" disabled={li === 0}>
                            ↑
                          </button>
                        </form>
                        <form action={moveLessonDown}>
                          <button
                            type="submit"
                            className="hover:text-white"
                            disabled={li === mod.lessons.length - 1}
                          >
                            ↓
                          </button>
                        </form>
                        <form action={deleteLessonWithId}>
                          <button type="submit" className="text-red-400 hover:underline">
                            O&apos;chirish
                          </button>
                        </form>
                      </div>
                    </div>
                  );
                })}
              </div>

              <details className="mt-3">
                <summary className="cursor-pointer text-xs font-medium text-amber-400">
                  + Yangi dars qo&apos;shish
                </summary>
                <form action={createLessonInModule} className="mt-3 flex flex-wrap items-end gap-3">
                  <div className="flex flex-1 flex-col gap-1.5">
                    <Label htmlFor={`lesson_title_uz_${mod.id}`}>Dars nomi (UZ)</Label>
                    <Input id={`lesson_title_uz_${mod.id}`} name="title_uz" required />
                  </div>
                  <div className="flex flex-1 flex-col gap-1.5">
                    <Label htmlFor={`lesson_title_ru_${mod.id}`}>Dars nomi (RU)</Label>
                    <Input id={`lesson_title_ru_${mod.id}`} name="title_ru" />
                  </div>
                  <div className="flex flex-1 flex-col gap-1.5">
                    <Label htmlFor={`lesson_title_en_${mod.id}`}>Dars nomi (EN)</Label>
                    <Input id={`lesson_title_en_${mod.id}`} name="title_en" />
                  </div>
                  <Button type="submit" variant="outline" size="sm">
                    Qo&apos;shish
                  </Button>
                </form>
              </details>
            </div>
          );
        })}
      </div>

      <details className="mt-6 rounded-xl border border-dashed border-slate-800 p-4">
        <summary className="cursor-pointer text-sm font-medium text-amber-400">
          + Yangi modul qo&apos;shish
        </summary>
        <form action={createModule.bind(null, course.id)} className="mt-4 flex flex-wrap items-end gap-3">
          <div className="flex flex-1 flex-col gap-1.5">
            <Label htmlFor="module_title_uz">Modul nomi (UZ)</Label>
            <Input id="module_title_uz" name="title_uz" required />
          </div>
          <div className="flex flex-1 flex-col gap-1.5">
            <Label htmlFor="module_title_ru">Modul nomi (RU)</Label>
            <Input id="module_title_ru" name="title_ru" />
          </div>
          <div className="flex flex-1 flex-col gap-1.5">
            <Label htmlFor="module_title_en">Modul nomi (EN)</Label>
            <Input id="module_title_en" name="title_en" />
          </div>
          <Button type="submit" variant="outline" size="sm">
            Qo&apos;shish
          </Button>
        </form>
      </details>
    </div>
  );
}

function Field({
  label,
  name,
  defaultValue,
  type = "text",
  textarea = false,
  placeholder,
}: {
  label: string;
  name: string;
  defaultValue?: string;
  type?: string;
  textarea?: boolean;
  placeholder?: string;
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
          placeholder={placeholder}
          className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white placeholder:text-slate-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500"
        />
      ) : (
        <Input id={name} name={name} type={type} defaultValue={defaultValue} placeholder={placeholder} />
      )}
    </div>
  );
}
