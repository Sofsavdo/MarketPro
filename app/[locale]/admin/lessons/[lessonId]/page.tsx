import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { updateLesson, addQuizQuestion, deleteQuizQuestion } from "@/lib/lms/admin-actions";

export default async function AdminLessonEditPage({
  params,
}: {
  params: Promise<{ lessonId: string }>;
}) {
  const { lessonId } = await params;
  const supabase = await createClient();
  const { data: lesson } = await supabase
    .from("lessons")
    .select("*")
    .eq("id", lessonId)
    .maybeSingle();
  if (!lesson) notFound();

  const { data: course } = await supabase
    .from("courses")
    .select("id, slug, title_uz")
    .eq("id", lesson.course_id)
    .maybeSingle();

  const { data: questions } = await supabase
    .from("quiz_questions")
    .select("*")
    .eq("lesson_id", lessonId)
    .order("order_index", { ascending: true });

  const updateLessonWithId = updateLesson.bind(null, lessonId);
  const addQuizQuestionWithId = addQuizQuestion.bind(null, lessonId);

  return (
    <div>
      {course && (
        <Link
          href={`/admin/courses/${course.id}`}
          className="text-sm text-slate-400 hover:text-white"
        >
          ← {course.title_uz}
        </Link>
      )}
      <h1 className="mt-2 text-2xl font-bold text-white">{lesson.title_uz}</h1>

      <form action={updateLessonWithId} className="mt-8 max-w-2xl space-y-6">
        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="Sarlavha (UZ)" name="title_uz" defaultValue={lesson.title_uz} />
          <Field label="Sarlavha (RU)" name="title_ru" defaultValue={lesson.title_ru} />
          <Field label="Sarlavha (EN)" name="title_en" defaultValue={lesson.title_en} />
        </div>

        <Field
          label="Video havolasi (YouTube/Vimeo)"
          name="video_url"
          defaultValue={lesson.video_url}
        />

        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="Matn (UZ)" name="content_uz" defaultValue={lesson.content_uz ?? ""} textarea />
          <Field label="Matn (RU)" name="content_ru" defaultValue={lesson.content_ru ?? ""} textarea />
          <Field label="Matn (EN)" name="content_en" defaultValue={lesson.content_en ?? ""} textarea />
        </div>

        <label className="flex items-center gap-2 text-sm text-slate-300">
          <input
            type="checkbox"
            name="is_free_preview"
            defaultChecked={lesson.is_free_preview}
            className="accent-amber-500"
          />
          Bepul ko&apos;rish sifatida belgilash
        </label>

        <Button type="submit">Saqlash</Button>
      </form>

      <h2 className="mt-12 text-xl font-semibold text-white">Test savollari</h2>
      <p className="mt-1 text-sm text-slate-500">
        Agar savollar mavjud bo&apos;lsa, keyingi darsga o&apos;tish uchun student testdan
        muvaffaqiyatli o&apos;tishi shart bo&apos;ladi.
      </p>

      <div className="mt-4 space-y-3">
        {(questions ?? []).map((q, qi) => (
          <div key={q.id} className="rounded-lg border border-slate-800 p-4 text-sm">
            <div className="flex items-start justify-between gap-4">
              <p className="text-white">
                {qi + 1}. {q.question_uz}
              </p>
              <form action={deleteQuizQuestion.bind(null, q.id, lessonId)}>
                <button type="submit" className="shrink-0 text-red-400 hover:underline">
                  O&apos;chirish
                </button>
              </form>
            </div>
            <ul className="mt-2 space-y-1 text-slate-400">
              {q.options_uz.map((option, oi) => (
                <li key={oi} className={oi === q.correct_index ? "text-emerald-400" : undefined}>
                  {oi === q.correct_index ? "✓ " : "· "}
                  {option}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      <details className="mt-6 rounded-lg border border-slate-800 p-4">
        <summary className="cursor-pointer text-sm font-medium text-amber-400">
          + Yangi savol qo&apos;shish
        </summary>
        <form action={addQuizQuestionWithId} className="mt-4 max-w-2xl space-y-4">
          <div className="grid gap-4 sm:grid-cols-3">
            <Field label="Savol (UZ)" name="question_uz" />
            <Field label="Savol (RU)" name="question_ru" />
            <Field label="Savol (EN)" name="question_en" />
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            <Field
              label="Variantlar (UZ, har biri yangi qatorda)"
              name="options_uz"
              textarea
            />
            <Field
              label="Variantlar (RU, har biri yangi qatorda)"
              name="options_ru"
              textarea
            />
            <Field
              label="Variantlar (EN, har biri yangi qatorda)"
              name="options_en"
              textarea
            />
          </div>
          <Field
            label="To'g'ri javob raqami (0 dan boshlab)"
            name="correct_index"
            type="number"
            defaultValue="0"
          />
          <Button type="submit" variant="outline">
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
