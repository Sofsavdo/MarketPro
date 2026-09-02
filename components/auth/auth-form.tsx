"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createClient } from "@/lib/supabase/client";
import { Link, useRouter } from "@/i18n/navigation";
import { redeemReferral } from "@/lib/lms/referral-actions";
import { normalizePhone } from "@/lib/utils";

export function AuthForm({ mode }: { mode: "login" | "register" }) {
  const t = useTranslations("auth");
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = createClient();

  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const normalizedPhone = normalizePhone(phone);

    if (mode === "register") {
      const { error } = await supabase.auth.signUp({
        phone: normalizedPhone,
        password,
        options: {
          data: { full_name: fullName, terms_accepted_at: new Date().toISOString() },
        },
      });
      if (error) setError(error.message);
      else {
        // Fire-and-forget: records the signup request's IP server-side
        // (see route handler) instead of asking the student for a postal
        // address nobody's ever going to mail anything to.
        fetch("/api/auth/record-signup-ip", { method: "POST" }).catch(() => {});
        const ref = searchParams.get("ref");
        if (ref) await redeemReferral(ref);
        router.refresh();
        router.push("/dashboard");
      }
    } else {
      const { error } = await supabase.auth.signInWithPassword({
        phone: normalizedPhone,
        password,
      });
      if (error) setError(error.message);
      else {
        router.refresh();
        router.push("/dashboard");
      }
    }
    setLoading(false);
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      {mode === "register" && (
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="fullName">{t("fullName")}</Label>
          <Input
            id="fullName"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            required
          />
        </div>
      )}

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="phone">{t("phone")}</Label>
        <Input
          id="phone"
          type="tel"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder="+998 90 123 45 67"
          required
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="password">{t("password")}</Label>
        <Input
          id="password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          minLength={6}
          required
        />
      </div>

      {mode === "register" && (
        <label className="flex items-start gap-2 text-sm text-slate-400">
          <input
            type="checkbox"
            checked={termsAccepted}
            onChange={(e) => setTermsAccepted(e.target.checked)}
            required
            className="mt-0.5 accent-amber-500"
          />
          <span>
            {t("termsAgreePrefix")}{" "}
            <Link href="/terms" target="_blank" className="text-amber-400 hover:underline">
              {t("termsAgreeTerms")}
            </Link>{" "}
            {t("termsAgreeAnd")}{" "}
            <Link href="/refund-policy" target="_blank" className="text-amber-400 hover:underline">
              {t("termsAgreeRefund")}
            </Link>{" "}
            {t("termsAgreeSuffix")}
          </span>
        </label>
      )}

      {error && <p className="text-sm text-red-400">{error}</p>}

      <Button
        type="submit"
        className="mt-2"
        disabled={loading || (mode === "register" && !termsAccepted)}
      >
        {loading ? "..." : mode === "register" ? t("registerButton") : t("loginButton")}
      </Button>
    </form>
  );
}
