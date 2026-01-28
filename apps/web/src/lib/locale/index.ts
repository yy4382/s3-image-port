import { z } from "zod";
import { type LocaleType, routing } from "@/i18n/routing";

/** @description Storage key for persisted locale preference */
export const PERSISTED_LOCALE_KEY = "s3ip:locale";

const localeSchema = z.enum(routing.locales);

/** @description Retrieve persisted locale, defaults to `routing.defaultLocale` */
export const getPersistedLocale = (): LocaleType => {
  const cached = localStorage.getItem(PERSISTED_LOCALE_KEY);
  return localeSchema.catch(routing.defaultLocale).parse(cached);
};

/** @description Persist locale preference to local storage */
export const persistLocale = (locale: string) => {
  localStorage.setItem(PERSISTED_LOCALE_KEY, locale);
};
