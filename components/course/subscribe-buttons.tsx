"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { useRouter } from "@/i18n/navigation";

export function SubscribeButtons({
  plan,
  isLoggedIn,
}: {
  plan: "monthly" | "yearly";
  isLoggedIn: boolean;
}) {
  const t = useTranslations("course");
  const router = useRouter();
  const [loading, setLoading] = useState<"click" | "payme" | null>(null);
  const [promoCode, setPromoCode] = useState("");

  async function pay(provider: "click" | "payme") {
    if (!isLoggedIn) {
      router.push("/login");
      return;
    }
    setLoading(provider);
    try {
      const res = await fetch(`/api/payments/${provider}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subscriptionPlan: plan, promoCode: promoCode.trim() || undefined }),
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
      <Button className="w-full" disabled={loading !== null} onClick={() => pay("click")}>
        {loading === "click" ? "..." : "Click"}
      </Button>
      <Button
        className="w-full"
        variant="outline"
        disabled={loading !== null}
        onClick={() => pay("payme")}
      >
        {loading === "payme" ? "..." : "Payme"}
      </Button>
    </div>
  );
}
