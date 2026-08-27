"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { formatSom, cn } from "@/lib/utils";
import { computeMonthlyInstallment } from "@/lib/pricing";
import { submitInstallmentLead } from "@/lib/lms/installment-lead-actions";
import type { Locale } from "@/i18n/routing";
import { CheckCircle2 } from "lucide-react";

type Tier = "start" | "standard" | "pro";

export function PurchaseButtons({
  courseId,
  prices,
  locale,
}: {
  courseId: string;
  prices: { start: number; standard: number; pro: number };
  locale: Locale;
}) {
  const t = useTranslations("course");
  const [tier, setTier] = useState<Tier>("standard");
  const [loading, setLoading] = useState<"click" | "payme" | null>(null);
  const [promoCode, setPromoCode] = useState("");
  const [leadSubmitting, setLeadSubmitting] = useState(false);
  const [leadSubmitted, setLeadSubmitted] = useState(false);

  const price = prices[tier];
  const monthlyAmount = computeMonthlyInstallment(price);

  const tierOptions: { value: Tier; label: string; desc: string }[] = [
    { value: "start", label: t("tierStart"), desc: t("tierStartDesc") },
    { value: "standard", label: t("tierStandard"), desc: t("tierStandardDesc") },
    { value: "pro", label: t("tierPro"), desc: t("tierProDesc") },
  ];

  async function pay(provider: "click" | "payme") {
    setLoading(provider);
    try {
      const res = await fetch(`/api/payments/${provider}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          courseId,
          tier,
          promoCode: promoCode.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (data.checkoutUrl) {
        window.location.href = data.checkoutUrl;
      }
    } finally {
      setLoading(null);
    }
  }

  async function requestInstallment() {
    setLeadSubmitting(true);
    try {
      await submitInstallmentLead(courseId, tier);
      setLeadSubmitted(true);
    } finally {
      setLeadSubmitting(false);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div>
        <p className="text-sm font-medium text-slate-300">{t("chooseTier")}</p>
        <div className="mt-2 grid gap-2 sm:grid-cols-3">
          {tierOptions.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => setTier(opt.value)}
              className={cn(
                "rounded-lg border p-2.5 text-left text-xs transition-colors",
                tier === opt.value
                  ? "border-amber-500 bg-amber-500/10"
                  : "border-slate-700 hover:border-slate-600",
              )}
            >
              <p className={cn("font-semibold", tier === opt.value ? "text-amber-400" : "text-white")}>
                {opt.label}
              </p>
              <p className="mt-0.5 text-slate-400">{opt.desc}</p>
            </button>
          ))}
        </div>
      </div>

      <div>
        <p className="text-2xl font-bold text-amber-500">{formatSom(price, locale)}</p>
        <p className="text-base font-medium text-slate-300">
          {t("orMonthly", { amount: formatSom(monthlyAmount, locale) })}
        </p>
      </div>

      <input
        type="text"
        value={promoCode}
        onChange={(e) => setPromoCode(e.target.value)}
        placeholder={t("promoCodePlaceholder")}
        className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm uppercase text-white placeholder:text-slate-500 placeholder:normal-case focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500"
      />

      <div className="flex flex-col gap-2">
        <Button className="w-full" disabled={loading !== null} onClick={() => pay("click")}>
          {loading === "click" ? "..." : `${t("buyNow")} — Click`}
        </Button>
        <Button
          className="w-full"
          variant="outline"
          disabled={loading !== null}
          onClick={() => pay("payme")}
        >
          {loading === "payme" ? "..." : `${t("buyNow")} — Payme`}
        </Button>
      </div>

      <div className="rounded-lg border border-dashed border-slate-700 p-3">
        {leadSubmitted ? (
          <p className="flex items-center gap-2 text-sm text-emerald-400">
            <CheckCircle2 className="h-4 w-4 shrink-0" />
            {t("installmentLeadSubmitted")}
          </p>
        ) : (
          <>
            <p className="text-xs text-slate-400">{t("installmentHint")}</p>
            <Button
              variant="ghost"
              size="sm"
              className="mt-2 w-full"
              disabled={leadSubmitting}
              onClick={requestInstallment}
            >
              {leadSubmitting ? "..." : t("requestInstallment")}
            </Button>
          </>
        )}
      </div>
    </div>
  );
}
