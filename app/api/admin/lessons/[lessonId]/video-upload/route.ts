import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/lms/admin-actions";
import { createBunnyVideo, getBunnyUploadAuth } from "@/lib/video/bunny";

/**
 * Creates the Bunny Stream video object up front and hands the browser
 * everything it needs to resume-upload the file directly to Bunny's TUS
 * endpoint — the file itself never passes through this server, so a large
 * lesson video isn't bounded by a Next.js request body limit.
 *
 * Deliberately does NOT write bunny_video_id to the lesson row yet — that
 * only happens once the upload actually finishes (see finalizeLessonVideo,
 * called from the client's onSuccess). Writing it here would mark the
 * lesson as "has a video" the moment upload starts, so a failed/abandoned
 * upload would leave the admin panel showing a broken, unplayable preview
 * with no direct way to retry short of first deleting it.
 */
export async function POST(request: NextRequest, { params }: { params: Promise<{ lessonId: string }> }) {
  try {
    await requireAdmin();
  } catch {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  // lessonId isn't used here (see comment above) — kept in the route path
  // so the URL still identifies which lesson the upload belongs to.
  await params;
  const { title } = (await request.json()) as { title: string };

  const videoId = await createBunnyVideo(title || "Dars videosi");
  const { libraryId, expire, signature } = getBunnyUploadAuth(videoId);

  return NextResponse.json({ videoId, libraryId, expire, signature });
}
