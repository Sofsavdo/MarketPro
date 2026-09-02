import { getTranslations } from "next-intl/server";
import { ShieldCheck } from "lucide-react";

export default async function RefundPolicyPage() {
  const t = await getTranslations("legal.refund");

  return (
    <div className="mx-auto max-w-3xl px-4 py-16">
      <ShieldCheck className="h-10 w-10 text-amber-500" />
      <h1 className="mt-4 text-3xl font-bold text-white">{t("title")}</h1>
      <p className="mt-3 text-slate-400">{t("intro")}</p>

      <div className="mt-10 space-y-6">
        <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-6">
          <h2 className="text-lg font-semibold text-white">{t("generalTitle")}</h2>
          <p className="mt-2 text-slate-400">{t("generalBody")}</p>
        </div>
        <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-6">
          <h2 className="text-lg font-semibold text-white">{t("actionTitle")}</h2>
          <p className="mt-2 text-slate-400">{t("actionBody")}</p>
        </div>
        <div className="rounded-2xl border border-amber-500/30 bg-amber-500/5 p-6">
          <h2 className="text-lg font-semibold text-white">{t("installmentTitle")}</h2>
          <p className="mt-2 text-slate-400">{t("installmentBody")}</p>
        </div>
        <div>
          <h2 className="text-lg font-semibold text-white">{t("howTitle")}</h2>
          <p className="mt-2 text-slate-400">{t("howBody")}</p>
        </div>
        <p className="text-sm text-slate-500">{t("note")}</p>
      </div>
    </div>
  );
}
