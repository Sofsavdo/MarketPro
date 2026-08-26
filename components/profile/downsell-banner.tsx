import { getTranslations } from "next-intl/server";
import { MessageCircle } from "lucide-react";
import { OPERATOR_TELEGRAM_URL } from "@/lib/constants";

/**
 * Persistent CTA shown to every active subscriber, nudging the "start"
 * (video + community) tier toward buying a VIP course (live + mentor).
 * This is the downsell → upsell loop from the CRM funnel: a subscriber is
 * a warm lead an operator should be following up with.
 */
export async function DownsellBanner() {
  const t = await getTranslations("dashboard");

  return (
    <div className="mt-6 flex flex-col items-start justify-between gap-3 rounded-xl border border-amber-500/40 bg-amber-500/5 p-4 sm:flex-row sm:items-center">
      <p className="text-sm text-slate-200">{t("downsellBanner")}</p>
      <a
        href={OPERATOR_TELEGRAM_URL}
        target="_blank"
        rel="noreferrer"
        className="inline-flex shrink-0 items-center gap-2 rounded-lg bg-amber-500 px-4 py-2 text-sm font-semibold text-slate-950 hover:bg-amber-400"
      >
        <MessageCircle className="h-4 w-4" />
        {t("downsellCta")}
      </a>
    </div>
  );
}
