import { type LocaleType, routing } from "@/i18n/routing";

/** @description Storage key for persisted locale preference */
export const PERSISTED_LOCALE_KEY = "SETTINGS_LOCALE";

/** @description Retrieve persisted locale, defaults to `routing.defaultLocale` */
export const getPersistedLocale = (): LocaleType => {
  const cached = localStorage.getItem(PERSISTED_LOCALE_KEY) as LocaleType;
  if (!cached) {
    return routing.defaultLocale;
  }
  return routing.locales.includes(cached) ? cached : routing.defaultLocale;
};

/** @description Persist locale preference to local storage */
export const persistLocale = (locale: string) => {
  localStorage.setItem(PERSISTED_LOCALE_KEY, locale);
};
