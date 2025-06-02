import { defineRouting } from "next-intl/routing";

export const routing = defineRouting({
  // A list of all locales that are supported
  locales: ["en", "zh"],

  // Used when no locale matches
  defaultLocale: "en",
});

export const localeLocalNames: Record<
  (typeof routing.locales)[number],
  string
> = {
  en: "English",
  zh: "中文",
} as const;
