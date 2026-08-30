import { createAdminClient } from "@/lib/supabase/server";

const MAX_IMAGE_BYTES = 5 * 1024 * 1024; // 5 MB
const ALLOWED_TYPES: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

/**
 * Uploads a cover/thumbnail image picked in an admin `<input type="file">`
 * to Supabase Storage and returns its public URL — used by
 * createCourse/updateCourse (course-covers) and updateLesson
 * (lesson-thumbnails) instead of asking the admin to paste an external
 * image URL. Returns null when no file was actually chosen (an empty
 * FormData file input still comes through as a zero-byte File, not
 * undefined), so callers can fall back to "leave the existing image alone."
 */
export async function uploadImage(
  bucket: "course-covers" | "lesson-thumbnails" | "landing-images",
  file: File | null,
): Promise<string | null> {
  if (!file || file.size === 0) return null;

  const ext = ALLOWED_TYPES[file.type];
  if (!ext) {
    throw new Error("Faqat JPG, PNG yoki WEBP formatidagi rasm yuklash mumkin.");
  }
  if (file.size > MAX_IMAGE_BYTES) {
    throw new Error("Rasm hajmi 5 MB dan oshmasligi kerak.");
  }

  const admin = await createAdminClient();
  const path = `${crypto.randomUUID()}.${ext}`;

  const { error } = await admin.storage.from(bucket).upload(path, file, {
    contentType: file.type,
    upsert: false,
  });
  if (error) {
    throw new Error(`Rasm yuklashda xatolik: ${error.message}`);
  }

  const { data } = admin.storage.from(bucket).getPublicUrl(path);
  return data.publicUrl;
}
