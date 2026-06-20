export { useTranslations, useLocale } from "next-intl";
export { useFormatTimeShort, useFormatDateMedium } from "@/lib/i18n/format";
import { useTranslations } from "next-intl";

const FULL_DAY_KEYS = [
  "sunday",
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
] as const;

const SHORT_DAY_KEYS = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"] as const;

export function useTimeGreeting(): string {
  const t = useTranslations("common.greeting");
  const h = new Date().getHours();
  if (h < 12) return t("morning");
  if (h < 18) return t("afternoon");
  return t("evening");
}

export function useFullDayNames(): string[] {
  const t = useTranslations("common.days");
  return FULL_DAY_KEYS.map((key) => t(key));
}

export function useShortDayNames(): string[] {
  const t = useTranslations("common.days");
  return SHORT_DAY_KEYS.map((key) => t(key));
}
