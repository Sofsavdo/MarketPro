"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useRouter } from "@/i18n/navigation";

export function SubscribeButtons({
  plan,
  amount,
  isLoggedIn,
}: {
  plan: "monthly" | "yearly";
  amount: number;
  isLoggedIn: boolean;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState<"click" | "payme" | null>(null);

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
        body: JSON.stringify({ amount, subscriptionPlan: plan }),
      });
      const data = await res.json();
      if (data.checkoutUrl) window.location.href = data.checkoutUrl;
    } finally {
      setLoading(null);
    }
  }

  return (
    <div className="flex flex-col gap-2">
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
