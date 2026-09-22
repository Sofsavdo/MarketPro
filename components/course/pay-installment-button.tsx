"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";

export function PayInstallmentButton({ installmentPaymentId }: { installmentPaymentId: string }) {
  const t = useTranslations("course");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);

  async function pay() {
    setLoading(true);
    setError(false);
    try {
      const res = await fetch("/api/payments/click", {
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
      setLoading(false);
    }
  }

  return (
    <div>
      <Button size="sm" disabled={loading} onClick={pay}>
        {loading ? "..." : "Click"}
      </Button>
      {error && <p className="mt-1.5 text-xs text-red-500">{t("paymentError")}</p>}
    </div>
  );
}
