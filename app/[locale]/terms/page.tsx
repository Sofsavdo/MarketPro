import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";

export default async function TermsPage() {
  const t = await getTranslations("legal.terms");
  const tFooter = await getTranslations("footer");

  const sections = ["s1", "s2", "s3", "s4", "s5", "s6"] as const;

  return (
    <div className="mx-auto max-w-3xl px-4 py-16">
      <h1 className="text-3xl font-bold text-white">{t("title")}</h1>
      <div className="mt-10 space-y-8 text-slate-300">
        {sections.map((s) => (
          <div key={s}>
            <h2 className="text-lg font-semibold text-white">{t(`${s}Title`)}</h2>
            <p className="mt-2 leading-relaxed text-slate-400">
              {s === "s5" ? (
                <>
                  {t(`${s}Body`)}{" "}
                  <Link href="/refund-policy" className="text-amber-400 hover:underline">
                    {tFooter("refundPolicy")}
                  </Link>
                </>
              ) : (
                t(`${s}Body`)
              )}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
