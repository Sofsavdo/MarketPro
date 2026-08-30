import crypto from "node:crypto";

/**
 * Bunny.net Stream integration — replaces the old YouTube-embed lesson video
 * (react-player). YouTube's iframe UI surfaces "related videos" that let a
 * student navigate off the course entirely, and its bootstrap script is slow
 * to start; Bunny's embed is a plain signed iframe with no such UI and HLS
 * adaptive playback. See docs.bunny.net/stream for the endpoints used here.
 */

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`${name} sozlanmagan (Railway environment variables'ga qo'shing)`);
  return value;
}

const STREAM_API_BASE = "https://video.bunnycdn.com/library";

/** Creates an empty video object in the library; returns its GUID (videoId). */
export async function createBunnyVideo(title: string): Promise<string> {
  const libraryId = requireEnv("BUNNY_STREAM_LIBRARY_ID");
  const apiKey = requireEnv("BUNNY_STREAM_API_KEY");

  const res = await fetch(`${STREAM_API_BASE}/${libraryId}/videos`, {
    method: "POST",
    headers: {
      AccessKey: apiKey,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({ title }),
  });
  if (!res.ok) {
    throw new Error(`Bunny video yaratilmadi (${res.status}): ${await res.text()}`);
  }
  const data = (await res.json()) as { guid: string };
  return data.guid;
}

/** Permanently deletes a video from the library (used when admin removes it). */
export async function deleteBunnyVideo(videoId: string): Promise<void> {
  const libraryId = requireEnv("BUNNY_STREAM_LIBRARY_ID");
  const apiKey = requireEnv("BUNNY_STREAM_API_KEY");

  await fetch(`${STREAM_API_BASE}/${libraryId}/videos/${videoId}`, {
    method: "DELETE",
    headers: { AccessKey: apiKey },
  });
}

/**
 * Signature the browser needs to resume-upload a file straight to Bunny's
 * TUS endpoint (video.bunnycdn.com/tusupload), bypassing our own server so
 * multi-hundred-MB lesson videos never pass through a Next.js request body.
 * Per docs.bunny.net/stream/tus-resumable-uploads: sha256(libraryId + apiKey
 * + expire + videoId), hex-encoded.
 */
export function getBunnyUploadAuth(videoId: string) {
  const libraryId = requireEnv("BUNNY_STREAM_LIBRARY_ID");
  const apiKey = requireEnv("BUNNY_STREAM_API_KEY");
  const expire = Math.floor(Date.now() / 1000) + 3600; // 1 hour to complete the upload

  const signature = crypto
    .createHash("sha256")
    .update(`${libraryId}${apiKey}${expire}${videoId}`)
    .digest("hex");

  return { libraryId, expire, signature };
}

/**
 * Signed embed-player URL (docs.bunny.net/stream/token-authentication):
 * token = sha256_hex(securityKey + videoId + expires). Regenerated on every
 * page render with a fresh few-hour expiry rather than stored, since the
 * lesson page itself already gates access.
 */
export function getBunnyEmbedUrl(videoId: string, ttlSeconds = 4 * 3600): string {
  const libraryId = requireEnv("BUNNY_STREAM_LIBRARY_ID");
  const securityKey = requireEnv("BUNNY_STREAM_TOKEN_AUTH_KEY");
  const expires = Math.floor(Date.now() / 1000) + ttlSeconds;

  const token = crypto
    .createHash("sha256")
    .update(`${securityKey}${videoId}${expires}`)
    .digest("hex");

  return `https://iframe.mediadelivery.net/embed/${libraryId}/${videoId}?token=${token}&expires=${expires}&autoplay=false`;
}
