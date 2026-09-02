"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";
import { formatSom, cn } from "@/lib/utils";
import { computeMonthlyInstallment } from "@/lib/pricing";
import { submitInstallmentLead } from "@/lib/lms/installment-lead-actions";
import { validatePromoCode } from "@/lib/lms/promo-actions";
import type { Locale } from "@/i18n/routing";
import { CheckCircle2, XCircle } from "lucide-react";

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
  const tAuth = useTranslations("auth");
  const [tier, setTier] = useState<Tier>("standard");
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [loading, setLoading] = useState<"click" | "payme" | null>(null);
  const [promoCode, setPromoCode] = useState("");
  const [promoChecking, setPromoChecking] = useState(false);
  const [promoResult, setPromoResult] = useState<{
    code: string;
    tier: Tier;
    discountPercent: number;
    discountedAmount: number;
  } | null>(null);
  const [promoInvalid, setPromoInvalid] = useState(false);
  const [leadSubmitting, setLeadSubmitting] = useState(false);
  const [leadSubmitted, setLeadSubmitted] = useState(false);

  const price = prices[tier];
  const monthlyAmount = computeMonthlyInstallment(price);
  // The applied preview only still matches if it was checked for this exact
  // tier and this exact code still sitting in the input — switching tiers
  // (which changes the price) or editing the code after activating must not
  // keep showing a discount computed against a different price.
  const appliedDiscount =
    promoResult && promoResult.code === promoCode.trim().toUpperCase() && promoResult.tier === tier
      ? promoResult
      : null;
  const displayedPrice = appliedDiscount?.discountedAmount ?? price;

  const tierOptions: { value: Tier; label: string; desc: string }[] = [
    { value: "start", label: t("tierStart"), desc: t("tierStartDesc") },
    { value: "standard", label: t("tierStandard"), desc: t("tierStandardDesc") },
    { value: "pro", label: t("tierPro"), desc: t("tierProDesc") },
  ];

  async function activatePromoCode() {
    const code = promoCode.trim();
    if (!code) return;
    setPromoChecking(true);
    setPromoInvalid(false);
    try {
      const result = await validatePromoCode(courseId, tier, code);
      if (result.valid && result.discountPercent !== undefined && result.discountedAmount !== undefined) {
        setPromoResult({
          code: code.toUpperCase(),
          tier,
          discountPercent: result.discountPercent,
          discountedAmount: result.discountedAmount,
        });
      } else {
        setPromoResult(null);
        setPromoInvalid(true);
      }
    } finally {
      setPromoChecking(false);
    }
  }

  async function pay(provider: "click" | "payme") {
    if (!termsAccepted) return;
    setLoading(provider);
    try {
      const res = await fetch(`/api/payments/${provider}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          courseId,
          tier,
          promoCode: promoCode.trim() || undefined,
          termsAccepted: true,
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
    if (!termsAccepted) return;
    setLeadSubmitting(true);
    try {
      await submitInstallmentLead(courseId, tier, true);
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
        {appliedDiscount ? (
          <div className="flex items-center gap-2">
            <p className="text-base font-medium text-slate-500 line-through">
              {formatSom(price, locale)}
            </p>
            <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-xs font-semibold text-emerald-400">
              -{appliedDiscount.discountPercent}%
            </span>
          </div>
        ) : null}
        <p className="text-2xl font-bold text-amber-500">{formatSom(displayedPrice, locale)}</p>
        <p className="text-base font-medium text-slate-300">
          {t("orMonthly", { amount: formatSom(monthlyAmount, locale) })}
        </p>
      </div>

      <div>
        <div className="flex gap-2">
          <input
            type="text"
            value={promoCode}
            onChange={(e) => {
              setPromoCode(e.target.value);
              setPromoInvalid(false);
            }}
            placeholder={t("promoCodePlaceholder")}
            className="min-w-0 flex-1 rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm uppercase text-white placeholder:text-slate-500 placeholder:normal-case focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500"
          />
          <Button
            type="button"
            variant="outline"
            disabled={!promoCode.trim() || promoChecking || !!appliedDiscount}
            onClick={activatePromoCode}
          >
            {promoChecking ? "..." : t("activatePromoCode")}
          </Button>
        </div>
        {appliedDiscount && (
          <p className="mt-1.5 flex items-center gap-1.5 text-xs text-emerald-400">
            <CheckCircle2 className="h-3.5 w-3.5 shrink-0" /> {t("promoCodeApplied")}
          </p>
        )}
        {promoInvalid && (
          <p className="mt-1.5 flex items-center gap-1.5 text-xs text-red-400">
            <XCircle className="h-3.5 w-3.5 shrink-0" /> {t("promoCodeInvalid")}
          </p>
        )}
      </div>

      <label className="flex items-start gap-2 text-xs text-slate-400">
        <input
          type="checkbox"
          checked={termsAccepted}
          onChange={(e) => setTermsAccepted(e.target.checked)}
          className="mt-0.5 accent-amber-500"
        />
        <span>
          {tAuth("termsAgreePrefix")}{" "}
          <Link href="/terms" target="_blank" className="text-amber-400 hover:underline">
            {tAuth("termsAgreeTerms")}
          </Link>{" "}
          {tAuth("termsAgreeAnd")}{" "}
          <Link href="/refund-policy" target="_blank" className="text-amber-400 hover:underline">
            {tAuth("termsAgreeRefund")}
          </Link>{" "}
          {tAuth("termsAgreeSuffix")}
        </span>
      </label>

      <div className="flex flex-col gap-2">
        <Button
          className="w-full"
          disabled={loading !== null || !termsAccepted}
          onClick={() => pay("click")}
        >
          {loading === "click" ? "..." : `${t("buyNow")} — Click`}
        </Button>
        <Button
          className="w-full"
          variant="outline"
          disabled={loading !== null || !termsAccepted}
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
              disabled={leadSubmitting || !termsAccepted}
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
