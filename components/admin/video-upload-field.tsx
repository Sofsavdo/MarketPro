"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Upload, Loader2 } from "lucide-react";

/**
 * Uploads a lesson video straight to Bunny.net Stream via resumable (TUS)
 * upload — the file goes browser → Bunny directly, our server only issues
 * the upload authorization (see app/api/admin/lessons/[lessonId]/video-upload).
 */
export function VideoUploadField({ lessonId }: { lessonId: string }) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [progress, setProgress] = useState<number | null>(null);
  const [stage, setStage] = useState<"idle" | "starting" | "uploading" | "processing" | "error">(
    "idle",
  );
  const [errorMessage, setErrorMessage] = useState("");

  async function handleFile(file: File) {
    setStage("starting");
    setErrorMessage("");
    try {
      const initRes = await fetch(`/api/admin/lessons/${lessonId}/video-upload`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: file.name }),
      });
      if (!initRes.ok) throw new Error("Yuklashni boshlab bo'lmadi");
      const { videoId, libraryId, expire, signature } = (await initRes.json()) as {
        videoId: string;
        libraryId: string;
        expire: number;
        signature: string;
      };

      const { Upload: TusUpload } = await import("tus-js-client");
      setStage("uploading");

      await new Promise<void>((resolve, reject) => {
        const upload = new TusUpload(file, {
          endpoint: "https://video.bunnycdn.com/tusupload",
          retryDelays: [0, 3000, 5000, 10000, 20000],
          headers: {
            AuthorizationSignature: signature,
            AuthorizationExpire: String(expire),
            VideoId: videoId,
            LibraryId: libraryId,
          },
          metadata: { filetype: file.type, title: file.name },
          onError: (error) => reject(error),
          onProgress: (bytesUploaded, bytesTotal) => {
            setProgress(Math.round((bytesUploaded / bytesTotal) * 100));
          },
          onSuccess: () => resolve(),
        });
        upload.start();
      });

      setStage("processing");
      router.refresh();
    } catch (err) {
      setStage("error");
      setErrorMessage(err instanceof Error ? err.message : "Video yuklashda xatolik");
    }
  }

  if (stage === "idle" || stage === "error") {
    return (
      <div className="flex flex-col gap-1.5">
        <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-dashed border-slate-700 px-4 py-3 text-sm text-slate-300 hover:border-amber-500/50 hover:text-white">
          <Upload className="h-4 w-4 shrink-0" />
          Video fayl tanlash (MP4)
          <input
            ref={inputRef}
            type="file"
            accept="video/*"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleFile(file);
            }}
          />
        </label>
        {errorMessage && <p className="text-sm text-red-400">{errorMessage}</p>}
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-slate-700 px-4 py-3 text-sm text-slate-300">
      <div className="flex items-center gap-2">
        <Loader2 className="h-4 w-4 shrink-0 animate-spin text-amber-500" />
        {stage === "starting" && "Boshlanmoqda..."}
        {stage === "uploading" && `Yuklanmoqda... ${progress ?? 0}%`}
        {stage === "processing" && "Yuklandi, Bunny.net qayta ishlamoqda (bir necha daqiqa vaqt olishi mumkin)..."}
      </div>
      {stage === "uploading" && (
        <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-slate-800">
          <div
            className="h-full rounded-full bg-amber-500 transition-all"
            style={{ width: `${progress ?? 0}%` }}
          />
        </div>
      )}
    </div>
  );
}
