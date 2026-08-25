import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";

export async function Footer() {
  const t = await getTranslations();

  return (
    <footer className="mt-auto border-t border-slate-800/80 bg-slate-950">
      <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-4 py-8 text-sm text-slate-500 sm:flex-row">
        <p>
          © {new Date().getFullYear()} {t("brand.fullName")} — {t("footer.company")}.{" "}
          {t("footer.rights")}
        </p>
        <div className="flex flex-wrap justify-center gap-6">
          <Link href="/courses" className="hover:text-slate-300">
            {t("nav.courses")}
          </Link>
          <Link href="/pricing" className="hover:text-slate-300">
            {t("nav.pricing")}
          </Link>
          <Link href="/terms" className="hover:text-slate-300">
            {t("footer.terms")}
          </Link>
          <Link href="/refund-policy" className="hover:text-slate-300">
            {t("footer.refundPolicy")}
          </Link>
          <Link href="/contact" className="hover:text-slate-300">
            {t("footer.contact")}
          </Link>
        </div>
      </div>
    </footer>
  );
}
