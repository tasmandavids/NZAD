import { useLocale } from "next-intl";
import { useCallback } from "react";

/** Parse "HH:MM" or "HH:MM:SS" into a Date for Intl formatting. */
function timeToDate(time: string): Date {
  const [h, m] = time.split(":").map(Number);
  const d = new Date();
  d.setHours(h, m ?? 0, 0, 0);
  return d;
}

export function formatTimeShort(time: string | null, locale: string): string {
  if (!time) return "";
  return new Intl.DateTimeFormat(locale, {
    hour: "numeric",
    minute: "2-digit",
  }).format(timeToDate(time));
}

export function formatDateMedium(iso: string, locale: string): string {
  return new Date(iso).toLocaleDateString(locale, {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function useFormatTimeShort() {
  const locale = useLocale();
  return useCallback((time: string | null) => formatTimeShort(time, locale), [locale]);
}

export function useFormatDateMedium() {
  const locale = useLocale();
  return useCallback((iso: string) => formatDateMedium(iso, locale), [locale]);
}
