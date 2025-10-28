export const routing = {
  // A list of all locales that are supported
  locales: ["en", "zh"],

  // Used when no locale matches
  defaultLocale: "en",
} as const;

export const localeLocalNames: Record<
  (typeof routing.locales)[number],
  string
> = {
  en: "English",
  zh: "中文",
} as const;

export class LocaleNotFoundError extends Error {
  constructor(requestLocale: string) {
    super(`Locale not found: ${requestLocale}`);
  }
}

export async function getLocale(requestLocale: string) {
  if (!(routing.locales as unknown as string[]).includes(requestLocale)) {
    throw new LocaleNotFoundError(requestLocale);
  }
  return {
    locale: requestLocale as (typeof routing.locales)[number],
    messages: (await import(`../../messages/${requestLocale}.json`)).default,
  };
}
