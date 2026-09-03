import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { createAdminClient } from "@/lib/supabase/server";
import { localizedField } from "@/lib/courses";
import type { Locale } from "@/i18n/routing";

/**
 * Issues (or returns the existing) certificate row once every lesson in the
 * course is completed — checked here, server-side, rather than trusted from
 * the client. Returns null if the course isn't actually finished yet.
 */
export async function getOrIssueCertificate(userId: string, courseId: string) {
  const admin = await createAdminClient();

  const { data: existing } = await admin
    .from("certificates")
    .select("*")
    .eq("user_id", userId)
    .eq("course_id", courseId)
    .maybeSingle();

  if (existing) return existing;

  const { count: totalLessons } = await admin
    .from("lessons")
    .select("id", { count: "exact", head: true })
    .eq("course_id", courseId);

  const { count: completedLessons } = await admin
    .from("user_progress")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("course_id", courseId)
    .eq("completed", true);

  if (!totalLessons || (completedLessons ?? 0) < totalLessons) return null;

  const { data: created } = await admin
    .from("certificates")
    .insert({ user_id: userId, course_id: courseId })
    .select("*")
    .single();

  return created ?? null;
}

/** Renders the certificate as a one-page A4-landscape PDF, generated on demand. */
export async function renderCertificatePdf(
  certificate: { id: string; issued_at: string },
  studentName: string,
  course: Record<string, unknown>,
  locale: Locale,
) {
  const pdf = await PDFDocument.create();
  const page = pdf.addPage([842, 595]); // A4 landscape, points
  const serif = await pdf.embedFont(StandardFonts.TimesRomanBold);
  const sans = await pdf.embedFont(StandardFonts.Helvetica);

  const gold = rgb(0.83, 0.65, 0.24);
  const ink = rgb(0.06, 0.09, 0.16);

  page.drawRectangle({ x: 0, y: 0, width: 842, height: 595, color: rgb(1, 1, 1) });
  page.drawRectangle({ x: 20, y: 20, width: 802, height: 555, borderColor: gold, borderWidth: 3 });

  const title = "SERTIFIKAT";
  page.drawText(title, {
    x: 421 - (serif.widthOfTextAtSize(title, 34) / 2),
    y: 440,
    size: 34,
    font: serif,
    color: ink,
  });

  const courseTitle = localizedField(course, "title", locale);
  const line1 = "Ushbu sertifikat";
  const line3 = `"${courseTitle}"`;
  const line4 = "kursini muvaffaqiyatli yakunlagani uchun beriladi.";

  const centered = (text: string, y: number, font = sans, size = 16, color = ink) => {
    page.drawText(text, { x: 421 - font.widthOfTextAtSize(text, size) / 2, y, size, font, color });
  };

  centered(line1, 370);
  centered(studentName, 335, serif, 24, gold);
  centered(line3, 295, serif, 18);
  centered(line4, 265);

  centered(`Sertifikat ID: ${certificate.id}`, 90, sans, 10, rgb(0.4, 0.4, 0.4));
  centered(
    `Berilgan sana: ${new Date(certificate.issued_at).toLocaleDateString("uz-UZ", { timeZone: "Asia/Tashkent" })}`,
    72,
    sans,
    10,
    rgb(0.4, 0.4, 0.4),
  );
  centered("Izdosh Academy", 130, serif, 16, ink);

  return pdf.save();
}
