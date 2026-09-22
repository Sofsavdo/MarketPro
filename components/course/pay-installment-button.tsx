"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";

export function PayInstallmentButton({ installmentPaymentId }: { installmentPaymentId: string }) {
  const t = useTranslations("course");
  const [loading, setLoading] = useState<"click" | "payme" | null>(null);
  const [error, setError] = useState(false);

  async function pay(provider: "click" | "payme") {
    setLoading(provider);
    setError(false);
    try {
      const res = await fetch(`/api/payments/${provider}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ installmentPaymentId }),
      });
      const data = await res.json().catch(() => null);
      if (res.ok && data?.checkoutUrl) {
        window.location.href = data.checkoutUrl;
        return;
      }
      setError(true);
    } catch {
      setError(true);
    } finally {
      setLoading(null);
    }
  }

  return (
    <div>
      <div className="flex gap-2">
        <Button size="sm" disabled={loading !== null} onClick={() => pay("click")}>
          {loading === "click" ? "..." : "Click"}
        </Button>
        <Button
          size="sm"
          variant="outline"
          className="border-amber-300 bg-white text-slate-800 hover:bg-amber-50"
          disabled={loading !== null}
          onClick={() => pay("payme")}
        >
          {loading === "payme" ? "..." : "Payme"}
        </Button>
      </div>
      {error && <p className="mt-1.5 text-xs text-red-500">{t("paymentError")}</p>}
    </div>
  );
}
