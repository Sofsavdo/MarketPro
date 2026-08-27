import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
  const { courseId, email, phone } = (await request.json()) as {
    courseId?: string;
    email?: string;
    phone?: string;
  };

  const trimmedEmail = email?.trim() ?? "";
  // Loose but real check — this list is a marketing/sales contact list an
  // operator later emails by hand, so a garbage string here isn't just
  // untidy data, it's a lead nobody can actually reach.
  if (!courseId || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
    return NextResponse.json({ error: "missing_fields" }, { status: 400 });
  }

  const admin = await createAdminClient();
  const { error } = await admin
    .from("waitlist")
    .insert({ course_id: courseId, email: trimmedEmail, phone: phone?.trim() || null });

  if (error) {
    return NextResponse.json({ error: "could_not_join" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
