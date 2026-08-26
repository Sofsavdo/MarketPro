import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
  const { courseId, email, phone } = (await request.json()) as {
    courseId?: string;
    email?: string;
    phone?: string;
  };

  if (!courseId || !email) {
    return NextResponse.json({ error: "missing_fields" }, { status: 400 });
  }

  const admin = await createAdminClient();
  const { error } = await admin.from("waitlist").insert({ course_id: courseId, email, phone });

  if (error) {
    return NextResponse.json({ error: "could_not_join" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
