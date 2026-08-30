import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/lms/admin-actions";
import { createAdminClient } from "@/lib/supabase/server";
import { createBunnyVideo, getBunnyUploadAuth } from "@/lib/video/bunny";

/**
 * Creates the Bunny Stream video object up front and hands the browser
 * everything it needs to resume-upload the file directly to Bunny's TUS
 * endpoint — the file itself never passes through this server, so a large
 * lesson video isn't bounded by a Next.js request body limit.
 */
export async function POST(request: NextRequest, { params }: { params: Promise<{ lessonId: string }> }) {
  try {
    await requireAdmin();
  } catch {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const { lessonId } = await params;
  const { title } = (await request.json()) as { title: string };

  const videoId = await createBunnyVideo(title || "Dars videosi");
  const { libraryId, expire, signature } = getBunnyUploadAuth(videoId);

  const admin = await createAdminClient();
  await admin.from("lessons").update({ bunny_video_id: videoId }).eq("id", lessonId);

  return NextResponse.json({ videoId, libraryId, expire, signature });
}
