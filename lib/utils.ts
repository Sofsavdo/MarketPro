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
 * This app only serves Uzbekistan, so every date/time shown to anyone —
 * student or admin — should read as Tashkent wall-clock time regardless of
 * which timezone the Node server process happens to run in (Vercel and
 * most hosts default to UTC, which silently shifted every displayed time
 * by 5 hours before this existed). Uzbekistan doesn't observe DST, so a
 * fixed IANA zone is always correct.
 */
const APP_TIME_ZONE = "Asia/Tashkent";

export function formatDateTime(
  date: string | Date,
  locale: Locale = "uz",
  options?: Intl.DateTimeFormatOptions,
) {
  return new Date(date).toLocaleString(toIntlLocale(locale), {
    timeZone: APP_TIME_ZONE,
    ...options,
  });
}

export function formatDate(
  date: string | Date,
  locale: Locale = "uz",
  options?: Intl.DateTimeFormatOptions,
) {
  return new Date(date).toLocaleDateString(toIntlLocale(locale), {
    timeZone: APP_TIME_ZONE,
    ...options,
  });
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
