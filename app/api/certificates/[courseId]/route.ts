import { NextRequest, NextResponse } from "next/server";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { getOrIssueCertificate, renderCertificatePdf } from "@/lib/lms/certificate";
import type { Locale } from "@/i18n/routing";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ courseId: string }> },
) {
  const { courseId } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const certificate = await getOrIssueCertificate(user.id, courseId);
  if (!certificate) {
    return NextResponse.json({ error: "course_not_completed" }, { status: 400 });
  }

  const admin = await createAdminClient();
  const [{ data: profile }, { data: course }] = await Promise.all([
    admin.from("profiles").select("full_name").eq("id", user.id).single(),
    admin.from("courses").select("*").eq("id", courseId).single(),
  ]);

  if (!course) {
    return NextResponse.json({ error: "course_not_found" }, { status: 404 });
  }

  const locale = (request.nextUrl.searchParams.get("locale") as Locale) ?? "uz";
  const pdfBytes = await renderCertificatePdf(
    certificate,
    profile?.full_name || "Izdosh Talabasi",
    course,
    locale,
  );

  return new NextResponse(new Blob([new Uint8Array(pdfBytes)]), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="sertifikat-${course.slug}.pdf"`,
    },
  });
}
