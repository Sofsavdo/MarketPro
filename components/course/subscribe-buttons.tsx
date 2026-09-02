"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Link, useRouter } from "@/i18n/navigation";

export function SubscribeButtons({
  plan,
  isLoggedIn,
}: {
  plan: "monthly" | "yearly";
  isLoggedIn: boolean;
}) {
  const t = useTranslations("course");
  const tAuth = useTranslations("auth");
  const router = useRouter();
  const [loading, setLoading] = useState<"click" | "payme" | null>(null);
  const [promoCode, setPromoCode] = useState("");
  const [termsAccepted, setTermsAccepted] = useState(false);

  async function pay(provider: "click" | "payme") {
    if (!isLoggedIn) {
      router.push("/login");
      return;
    }
    if (!termsAccepted) return;
    setLoading(provider);
    try {
      const res = await fetch(`/api/payments/${provider}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subscriptionPlan: plan,
          promoCode: promoCode.trim() || undefined,
          termsAccepted: true,
        }),
      });
      const data = await res.json();
      if (data.checkoutUrl) window.location.href = data.checkoutUrl;
    } finally {
      setLoading(null);
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <input
        type="text"
        value={promoCode}
        onChange={(e) => setPromoCode(e.target.value)}
        placeholder={t("promoCodePlaceholder")}
        className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm uppercase text-white placeholder:text-slate-500 placeholder:normal-case focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500"
      />
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
      <Button
        className="w-full justify-center gap-2"
        disabled={loading !== null || !termsAccepted}
        onClick={() => pay("click")}
      >
        {loading === "click" ? "..." : t("buyNow")}
        <span className="rounded bg-[#0a5ca8] px-1.5 py-0.5 text-[11px] font-bold tracking-wide text-white">
          CLICK
        </span>
      </Button>
      <Button
        className="w-full justify-center gap-2"
        variant="outline"
        disabled={loading !== null || !termsAccepted}
        onClick={() => pay("payme")}
      >
        {loading === "payme" ? "..." : t("buyNow")}
        <span className="rounded bg-[#00bfa5] px-1.5 py-0.5 text-[11px] font-bold tracking-wide text-slate-950">
          Payme
        </span>
      </Button>
      <p className="text-center text-xs text-slate-500">{t("afterPaymentNote")}</p>
    </div>
  );
}
