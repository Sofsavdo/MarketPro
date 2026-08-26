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

  const { courseId, lessonId } = (await request.json()) as {
    courseId: string;
    lessonId: string;
  };

  try {
    const nextLessonId = await completeLesson(user.id, courseId, lessonId);
    return NextResponse.json({ nextLessonId });
  } catch {
    return NextResponse.json({ error: "quiz_not_passed" }, { status: 400 });
  }
}
