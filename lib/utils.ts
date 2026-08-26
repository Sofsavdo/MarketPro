import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import type { Locale } from "@/i18n/routing";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const CURRENCY_SUFFIX: Record<Locale, string> = {
  uz: "so'm",
  ru: "сум",
  en: "UZS",
};

export function formatSom(amount: number, locale: Locale = "uz") {
  return `${new Intl.NumberFormat("uz-UZ").format(amount)} ${CURRENCY_SUFFIX[locale]}`;
}

const INTL_LOCALE: Record<Locale, string> = {
  uz: "uz-UZ",
  ru: "ru-RU",
  en: "en-US",
};

/** Maps our app locale to the BCP 47 tag Intl.Date*Format expects. */
export function toIntlLocale(locale: Locale) {
  return INTL_LOCALE[locale];
}
