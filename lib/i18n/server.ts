import { getTranslations as nextGetTranslations } from "next-intl/server";

export { getLocale, getMessages } from "next-intl/server";

export async function getTranslations(namespace?: string) {
  return nextGetTranslations(namespace);
}
