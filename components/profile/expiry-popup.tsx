"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { AlertTriangle, X } from "lucide-react";
import { OPERATOR_TELEGRAM_URL } from "@/lib/constants";

const DISMISS_KEY = "izdosh_expiry_popup_dismissed_on";

/**
 * A subscription expiring within 3 days pops this up once per day (re-shows
 * on the next visit if still applicable, but doesn't nag on every page
 * load) — prompting either a renewal or a VIP upgrade via an operator.
 */
export function ExpiryPopup({ daysLeft }: { daysLeft: number }) {
  const t = useTranslations("dashboard");
  const [open, setOpen] = useState(false);

  useEffect(() => {
    // localStorage only exists client-side, so whether this shows can't be
    // known during SSR — this one-time check against a browser-only API is
    // exactly what an effect is for, not something to compute during render.
    const today = new Date().toDateString();
    let dismissedToday = false;
    try {
      dismissedToday = localStorage.getItem(DISMISS_KEY) === today;
    } catch {
      dismissedToday = false;
    }
    // eslint-disable-next-line react-hooks/set-state-in-effect -- reading a browser-only API (localStorage), not derivable during render/SSR
    setOpen(!dismissedToday);
  }, []);

  function dismiss() {
    setOpen(false);
    try {
      localStorage.setItem(DISMISS_KEY, new Date().toDateString());
    } catch {
      // Storage might be unavailable (private mode) — the popup will just
      // show again next load, which is a harmless fallback.
    }
  }

  if (!open) return null;

  return (
    <div className="mb-6 flex items-start gap-3 rounded-xl border border-red-300 bg-red-50 p-4">
      <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-red-500" />
      <div className="flex-1">
        <p className="text-sm font-medium text-slate-950">
          {daysLeft <= 0 ? t("expiryPopupToday") : t("expiryPopupTitle", { days: daysLeft })}
        </p>
        <p className="mt-1 text-sm text-slate-600">{t("expiryPopupDesc")}</p>
        <div className="mt-3 flex flex-wrap gap-2">
          <Button asChild size="sm">
            <Link href="/pricing">{t("expiryPopupRenew")}</Link>
          </Button>
          <Button asChild size="sm" variant="outline">
            <a href={OPERATOR_TELEGRAM_URL} target="_blank" rel="noreferrer">
              {t("downsellCta")}
            </a>
          </Button>
        </div>
      </div>
      <button
        type="button"
        onClick={dismiss}
        aria-label="Close"
        className="shrink-0 text-slate-500 hover:text-slate-950"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}
