"use client";

import { useEffect } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const t = useTranslations("common");

  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 px-4 text-center">
      <p className="text-2xl font-semibold text-white">{t("errorTitle")}</p>
      <p className="max-w-md text-sm text-slate-400">{t("errorDesc")}</p>
      <Button onClick={reset}>{t("retry")}</Button>
    </div>
  );
}
