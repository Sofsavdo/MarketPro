"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 px-4 text-center">
      <p className="text-2xl font-semibold text-white">Xatolik yuz berdi</p>
      <p className="max-w-md text-sm text-slate-400">
        Sahifani yuklashda muammo bo&apos;ldi. Iltimos, qayta urinib ko&apos;ring.
      </p>
      <Button onClick={reset}>Qayta urinish</Button>
    </div>
  );
}
