"use client";

import { useLocale } from "next-intl";
import { usePathname, useRouter } from "@/i18n/navigation";
import { routing } from "@/i18n/routing";

const labels: Record<string, string> = { uz: "UZ", ru: "RU", en: "EN" };

export function LocaleSwitcher() {
  const locale = useLocale();
  const pathname = usePathname();
  const router = useRouter();

  return (
    <div className="flex items-center rounded-lg border border-slate-800 p-0.5 text-xs">
      {routing.locales.map((loc) => (
        <button
          key={loc}
          onClick={() => router.replace(pathname, { locale: loc })}
          className={`rounded-md px-2 py-1 font-medium transition-colors ${
            loc === locale ? "bg-amber-500 text-slate-950" : "text-slate-400 hover:text-white"
          }`}
        >
          {labels[loc]}
        </button>
      ))}
    </div>
  );
}
