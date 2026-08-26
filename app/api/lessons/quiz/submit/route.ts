import { NextRequest, NextResponse } from "next/server";
import { createClient, createAdminClient } from "@/lib/supabase/server";

// Grades a quiz server-side and, only on a pass, records it in
// user_progress immediately — completeLesson() later just reads that
// stored result rather than trusting a client-supplied "quizPassed" flag.
export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const { lessonId, answers } = (await request.json()) as {
    lessonId: string;
    answers: Record<string, number>;
  };

  const { data: lesson } = await supabase
    .from("lessons")
    .select("id, course_id")
    .eq("id", lessonId)
    .maybeSingle();
  if (!lesson) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  // RLS (has_quiz_access) already refuses this select unless the user has
  // course access or the lesson is a free preview — belt and suspenders.
  const { data: questions } = await supabase
    .from("quiz_questions")
    .select("id, correct_index")
    .eq("lesson_id", lessonId);

  if (!questions?.length) {
    return NextResponse.json({ error: "no_quiz" }, { status: 400 });
  }

  const results: Record<string, boolean> = {};
  let allCorrect = true;
  for (const q of questions) {
    const correct = answers[q.id] === q.correct_index;
    results[q.id] = correct;
    if (!correct) allCorrect = false;
  }

  if (allCorrect) {
    const admin = await createAdminClient();
    await admin.from("user_progress").upsert(
      {
        user_id: user.id,
        course_id: lesson.course_id,
        lesson_id: lessonId,
        quiz_passed: true,
      },
      { onConflict: "user_id,lesson_id" },
    );
  }

  return NextResponse.json({ passed: allCorrect, results });
}
