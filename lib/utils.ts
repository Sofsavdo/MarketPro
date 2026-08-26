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

/**
 * Normalizes a phone number to the E.164-ish digits-only form Supabase phone
 * auth expects (e.g. "998901234567"). Students type it as "+998 90 123 45 67"
 * or just "90 123 45 67" — a bare 9-digit local number is assumed to be
 * Uzbekistan (+998) since that's the only market this app serves.
 */
export function normalizePhone(input: string) {
  const digits = input.replace(/\D/g, "");
  if (digits.length === 9) return `998${digits}`;
  return digits;
}
