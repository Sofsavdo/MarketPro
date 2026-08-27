"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type PlanChoice = "full" | 2 | 3;

export function PurchaseButtons({ courseId }: { courseId: string }) {
  const t = useTranslations("course");
  const [plan, setPlan] = useState<PlanChoice>("full");
  const [loading, setLoading] = useState<"click" | "payme" | null>(null);
  const [promoCode, setPromoCode] = useState("");

  const planOptions: { value: PlanChoice; label: string }[] = [
    { value: "full", label: t("planFull") },
    { value: 2, label: t("planTwoPart") },
    { value: 3, label: t("planThreePart") },
  ];

  async function pay(provider: "click" | "payme") {
    setLoading(provider);
    try {
      const res = await fetch(`/api/payments/${provider}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          courseId,
          installmentsCount: plan === "full" ? undefined : plan,
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

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap gap-1.5">
        {planOptions.map((opt) => (
          <button
            key={opt.value}
            type="button"
            onClick={() => setPlan(opt.value)}
            className={cn(
              "rounded-full border px-2.5 py-1 text-xs font-medium transition-colors",
              plan === opt.value
                ? "border-amber-500 bg-amber-500/10 text-amber-400"
                : "border-slate-700 text-slate-400 hover:border-slate-600",
            )}
          >
            {opt.label}
          </button>
        ))}
      </div>
      {plan !== "full" && <p className="text-xs text-slate-500">{t("installmentHint")}</p>}

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
    </div>
  );
}
