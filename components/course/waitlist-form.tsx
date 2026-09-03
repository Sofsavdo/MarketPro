"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export function WaitlistForm({ courseId }: { courseId: string }) {
  const t = useTranslations("course");
  const tCommon = useTranslations("common");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [status, setStatus] = useState<"idle" | "submitting" | "done" | "error">("idle");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("submitting");
    try {
      const res = await fetch("/api/waitlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ courseId, email, phone }),
      });
      setStatus(res.ok ? "done" : "error");
    } catch {
      setStatus("error");
    }
  }

  if (status === "done") {
    return <p className="text-sm text-emerald-400">{t("waitlistDone")}</p>;
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3 sm:flex-row sm:items-end">
      <div className="flex-1">
        <Input
          className="border-amber-200 bg-white text-slate-950 placeholder:text-slate-400 focus-visible:ring-amber-500"
          type="email"
          placeholder="email@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
      </div>
      <div className="flex-1">
        <Input
          className="border-amber-200 bg-white text-slate-950 placeholder:text-slate-400 focus-visible:ring-amber-500"
          type="tel"
          placeholder="+998 90 123 45 67"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
        />
      </div>
      <Button type="submit" disabled={status === "submitting"}>
        {status === "submitting" ? "..." : t("waitlistJoin")}
      </Button>
      {status === "error" && (
        <p className="text-sm text-red-400">{tCommon("genericError")}</p>
      )}
    </form>
  );
}
