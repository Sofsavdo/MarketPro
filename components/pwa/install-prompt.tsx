"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Download, X } from "lucide-react";
import { Button } from "@/components/ui/button";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

const DISMISSED_KEY = "izdosh-pwa-install-dismissed";

/** Captures the browser's native "beforeinstallprompt" and shows a small,
 * dismissible banner instead of relying on the browser's own (often
 * inconsistent) mini-infobar. Chromium-based browsers only — Safari/iOS has
 * no such event and installs purely via its own "Add to Home Screen" menu. */
export function InstallPrompt() {
  const t = useTranslations("pwa");
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [dismissed, setDismissed] = useState(
    () => typeof window !== "undefined" && !!localStorage.getItem(DISMISSED_KEY)
  );

  useEffect(() => {
    if (localStorage.getItem(DISMISSED_KEY)) return;

    function onPrompt(e: Event) {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    }
    window.addEventListener("beforeinstallprompt", onPrompt);
    return () => window.removeEventListener("beforeinstallprompt", onPrompt);
  }, []);

  function dismiss() {
    localStorage.setItem(DISMISSED_KEY, "1");
    setDismissed(true);
  }

  async function install() {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    await deferredPrompt.userChoice;
    setDeferredPrompt(null);
    dismiss();
  }

  if (dismissed || !deferredPrompt) return null;

  return (
    <div className="fixed inset-x-4 bottom-4 z-50 mx-auto flex max-w-sm items-center gap-3 rounded-2xl border border-slate-800 bg-slate-900/95 p-4 shadow-xl backdrop-blur sm:inset-x-auto sm:right-4">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-amber-500/10 text-amber-500">
        <Download className="h-5 w-5" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-white">{t("title")}</p>
        <p className="mt-0.5 text-xs text-slate-400">{t("desc")}</p>
        <div className="mt-2 flex gap-2">
          <Button size="sm" onClick={install} className="h-8 px-3 text-xs">
            {t("install")}
          </Button>
          <Button size="sm" variant="ghost" onClick={dismiss} className="h-8 px-3 text-xs">
            {t("dismiss")}
          </Button>
        </div>
      </div>
      <button
        onClick={dismiss}
        aria-label={t("dismiss")}
        className="shrink-0 text-slate-500 hover:text-slate-300"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}
