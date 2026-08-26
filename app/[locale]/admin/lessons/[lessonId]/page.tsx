import { notFound } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/server";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  updateLesson,
  addQuizQuestion,
  deleteQuizQuestion,
  addLessonMaterial,
  deleteLessonMaterial,
} from "@/lib/lms/admin-actions";

const FILE_TYPE_LABELS: Record<string, string> = {
  pdf: "PDF",
  pptx: "PPTX (taqdimot)",
  doc: "Word hujjat",
  image: "Rasm",
  link: "Havola",
};

export default async function AdminLessonEditPage({
  params,
}: {
  params: Promise<{ lessonId: string }>;
}) {
  const { lessonId } = await params;
  const supabase = await createAdminClient();
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

  const { data: materials } = await supabase
    .from("lesson_materials")
    .select("*")
    .eq("lesson_id", lessonId)
    .order("order_index", { ascending: true });

  const updateLessonWithId = updateLesson.bind(null, lessonId);
  const addQuizQuestionWithId = addQuizQuestion.bind(null, lessonId);
  const addLessonMaterialWithId = addLessonMaterial.bind(null, lessonId);

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
          label="Video havolasi (YouTube/Vimeo) — ixtiyoriy, faqat matn/material bilan ham dars bo'lishi mumkin"
          name="video_url"
          defaultValue={lesson.video_url}
        />

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="thumbnail_file">
            Dars rasmi (kurs dasturi ro&apos;yxatida ko&apos;rinadi, JPG/PNG/WEBP, 5 MB gacha)
          </Label>
          {lesson.thumbnail_url && (
            // eslint-disable-next-line @next/next/no-img-element -- Supabase Storage URL, not an optimizable local asset
            <img
              src={lesson.thumbnail_url}
              alt=""
              className="h-24 w-40 rounded-lg border border-slate-800 object-cover"
            />
          )}
          <input
            id="thumbnail_file"
            name="thumbnail_file"
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-300 file:mr-3 file:rounded-md file:border-0 file:bg-amber-500 file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-slate-950 hover:file:bg-amber-400"
          />
        </div>

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

      <h2 className="mt-12 text-xl font-semibold text-white">Qo&apos;shimcha materiallar</h2>
      <p className="mt-1 text-sm text-slate-500">
        PDF, PPTX taqdimot yoki boshqa hujjatlar — dars videosidan tashqari (yoki
        o&apos;rniga) o&apos;quvchiga ko&apos;rgazmali material sifatida beriladi.
      </p>

      <div className="mt-4 space-y-2">
        {(materials ?? []).map((material) => (
          <div
            key={material.id}
            className="flex items-center justify-between gap-4 rounded-lg border border-slate-800 px-4 py-2 text-sm"
          >
            <a
              href={material.file_url}
              target="_blank"
              rel="noreferrer"
              className="text-slate-200 hover:text-amber-400 hover:underline"
            >
              {material.title_uz}{" "}
              <span className="text-slate-500">
                ({FILE_TYPE_LABELS[material.file_type] ?? material.file_type})
              </span>
            </a>
            <form action={deleteLessonMaterial.bind(null, material.id, lessonId)}>
              <button type="submit" className="shrink-0 text-red-400 hover:underline">
                O&apos;chirish
              </button>
            </form>
          </div>
        ))}
      </div>

      <details className="mt-4 rounded-lg border border-dashed border-slate-800 p-4">
        <summary className="cursor-pointer text-sm font-medium text-amber-400">
          + Material qo&apos;shish
        </summary>
        <form action={addLessonMaterialWithId} className="mt-4 max-w-2xl space-y-4">
          <div className="grid gap-4 sm:grid-cols-3">
            <Field label="Nomi (UZ)" name="title_uz" />
            <Field label="Nomi (RU)" name="title_ru" />
            <Field label="Nomi (EN)" name="title_en" />
          </div>
          <div className="grid gap-4 sm:grid-cols-[2fr_1fr]">
            <Field label="Fayl havolasi (URL)" name="file_url" placeholder="https://.../fayl.pdf" />
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="file_type">Turi</Label>
              <select
                id="file_type"
                name="file_type"
                defaultValue="pdf"
                className="h-10 rounded-lg border border-slate-700 bg-slate-900 px-3 text-sm text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500"
              >
                <option value="pdf">PDF</option>
                <option value="pptx">PPTX (taqdimot)</option>
                <option value="doc">Word hujjat</option>
                <option value="image">Rasm</option>
                <option value="link">Havola</option>
              </select>
            </div>
          </div>
          <Button type="submit" variant="outline">
            Qo&apos;shish
          </Button>
        </form>
      </details>

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
