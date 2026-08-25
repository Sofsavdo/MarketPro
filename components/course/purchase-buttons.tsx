"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import type { PlanTier } from "@/lib/supabase/types";

export function PurchaseButtons({
  courseId,
  tier,
}: {
  courseId: string;
  tier: PlanTier;
}) {
  const t = useTranslations("course");
  const [loading, setLoading] = useState<"click" | "payme" | null>(null);

  async function pay(provider: "click" | "payme") {
    setLoading(provider);
    try {
      const res = await fetch(`/api/payments/${provider}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ courseId, tier }),
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
  );
}
