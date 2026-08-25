import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";

export default async function NotFound() {
  const t = await getTranslations();

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 px-4 text-center">
      <p className="text-6xl font-bold text-amber-500">404</p>
      <p className="text-slate-400">{t("brand.tagline")}</p>
      <Button asChild>
        <Link href="/">{t("brand.name")}</Link>
      </Button>
    </div>
  );
}
