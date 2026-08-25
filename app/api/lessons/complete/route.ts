import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { completeLesson } from "@/lib/lms/access";

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const { courseId, lessonId, quizPassed } = (await request.json()) as {
    courseId: string;
    lessonId: string;
    quizPassed: boolean | null;
  };

  const nextLessonId = await completeLesson(user.id, courseId, lessonId, quizPassed);
  return NextResponse.json({ nextLessonId });
}
