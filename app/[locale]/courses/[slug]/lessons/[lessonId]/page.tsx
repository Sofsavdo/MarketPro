import { notFound, redirect } from "next/navigation";
import { getTranslations, getLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { ChevronLeft, Lock } from "lucide-react";
import { getCourseBySlug, localizedField } from "@/lib/courses";
import { getLessonAccess, isLessonLocked, isFreePreview } from "@/lib/lms/access";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import type { Locale } from "@/i18n/routing";
import { LessonPlayer } from "@/components/course/lesson-player";
import { getBunnyEmbedUrl } from "@/lib/video/bunny";
import { LessonComments } from "@/components/course/lesson-comments";
import { submitLessonComment } from "@/lib/lms/reviews-actions";

export default async function LessonPage({
  params,
}: {
  params: Promise<{ slug: string; lessonId: string }>;
}) {
  const { slug, lessonId } = await params;
  const t = await getTranslations();
  const locale = (await getLocale()) as Locale;

  const course = await getCourseBySlug(slug);
  if (!course) notFound();

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: lesson } = await supabase
    .from("lessons")
    .select("*")
    .eq("id", lessonId)
    .eq("course_id", course.id)
    .maybeSingle();
  if (!lesson) notFound();

  const access = await getLessonAccess(user.id, course.id);
  // Mirrors the curriculum list's lock logic (courses/[slug]/page.tsx): a
  // free-preview lesson must stay open to someone with no course access at
  // all, not just to someone who has access but hasn't reached it in
  // sequence yet. The previous version locked every lesson for anyone
  // without hasCourseAccess regardless of is_free_preview, so the "free"
  // first lesson was unopenable for exactly the students it's meant to hook.
  const locked = access.hasCourseAccess
    ? await isLessonLocked(user.id, course.id, lesson.order_index)
    : !isFreePreview(lesson);

  const { data: questions } = await supabase
    .from("quiz_questions")
    .select("*")
    .eq("lesson_id", lesson.id)
    .order("order_index", { ascending: true });

  const { data: progress } = await supabase
    .from("user_progress")
    .select("completed, quiz_passed")
    .eq("user_id", user.id)
    .eq("lesson_id", lesson.id)
    .maybeSingle();

  const { data: materials } = locked
    ? { data: null }
    : await supabase
        .from("lesson_materials")
        .select("*")
        .eq("lesson_id", lesson.id)
        .order("order_index", { ascending: true });

  const { data: commentRows } = locked
    ? { data: [] }
    : await supabase
        .from("lesson_comments")
        .select("id, comment, created_at, user_id")
        .eq("lesson_id", lesson.id)
        .order("created_at", { ascending: true });

  // Sequential prev/next navigation: order_index is unique and continuous
  // across the whole course (spans module boundaries — see seed.sql), so a
  // simple neighbor lookup by order_index is enough, no per-module logic
  // needed.
  const { data: navLessons } = await supabase
    .from("lessons")
    .select("id, order_index, is_free_preview")
    .eq("course_id", course.id)
    .order("order_index", { ascending: true });
  const navIndex = (navLessons ?? []).findIndex((l) => l.id === lesson.id);
  const prevLesson = navIndex > 0 ? navLessons![navIndex - 1] : null;
  const nextLesson =
    navIndex >= 0 && navIndex < (navLessons?.length ?? 0) - 1 ? navLessons![navIndex + 1] : null;
  const nextLocked = nextLesson
    ? access.hasCourseAccess
      ? await isLessonLocked(user.id, course.id, nextLesson.order_index)
      : !isFreePreview(nextLesson)
    : false;
  const commenterIds = [...new Set((commentRows ?? []).map((c) => c.user_id))];
  const commenterAdmin = commenterIds.length ? await createAdminClient() : null;
  const { data: commenterProfiles } = commenterAdmin
    ? await commenterAdmin.from("profiles").select("id, full_name").in("id", commenterIds)
    : { data: [] };
  const commenterNameById = new Map((commenterProfiles ?? []).map((p) => [p.id, p.full_name]));
  const comments = (commentRows ?? []).map((c) => ({
    ...c,
    full_name: commenterNameById.get(c.user_id) ?? null,
  }));

  return (
    <div className="mx-auto max-w-4xl px-4 py-10">
      <Link
        href={`/courses/${course.slug}`}
        className="inline-flex items-center gap-1 text-sm text-slate-400 hover:text-white"
      >
        <ChevronLeft className="h-4 w-4" /> {t("lesson.backToCourse")}
      </Link>

      <h1 className="mt-4 text-2xl font-bold text-white sm:text-3xl">
        {localizedField(lesson, "title", locale)}
      </h1>

      {locked ? (
        <div className="mt-8 flex flex-col items-center gap-3 rounded-2xl border border-slate-800 bg-slate-900/40 py-20 text-center">
          <Lock className="h-10 w-10 text-slate-500" />
          <p className="text-lg font-medium text-white">{t("lesson.locked")}</p>
          <p className="max-w-sm text-sm text-slate-400">{t("lesson.lockedDesc")}</p>
        </div>
      ) : (
        <LessonPlayer
          courseId={course.id}
          courseSlug={course.slug}
          lessonId={lesson.id}
          videoEmbedUrl={lesson.bunny_video_id ? getBunnyEmbedUrl(lesson.bunny_video_id) : undefined}
          content={localizedField(lesson, "content", locale) ?? undefined}
          questions={(questions ?? []).map((q) => ({
            id: q.id,
            question: localizedField(q, "question", locale),
            options: (q[`options_${locale}` as keyof typeof q] ??
              q.options_uz) as string[],
          }))}
          alreadyCompleted={!!progress?.completed}
          quizAlreadyPassed={!!progress?.quiz_passed}
          materials={(materials ?? []).map((m) => ({
            id: m.id,
            title: localizedField(m, "title", locale),
            fileUrl: m.file_url,
            fileType: m.file_type,
          }))}
          watermarkText={user.phone ? `${user.phone} · ${user.id.slice(0, 8)}` : undefined}
          prevLessonId={prevLesson?.id}
          nextLessonId={nextLesson?.id}
          nextLocked={nextLocked}
        />
      )}

      {!locked && (
        <LessonComments
          comments={comments}
          action={submitLessonComment.bind(
            null,
            lesson.id,
            `/courses/${course.slug}/lessons/${lesson.id}`,
          )}
          locale={locale}
        />
      )}
    </div>
  );
}
