"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";

export function PayInstallmentButton({ installmentPaymentId }: { installmentPaymentId: string }) {
  const [loading, setLoading] = useState<"click" | "payme" | null>(null);

  async function pay(provider: "click" | "payme") {
    setLoading(provider);
    try {
      const res = await fetch(`/api/payments/${provider}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ installmentPaymentId }),
      });
      const data = await res.json();
      if (data.checkoutUrl) window.location.href = data.checkoutUrl;
    } finally {
      setLoading(null);
    }
  }

  return (
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
  );
}
