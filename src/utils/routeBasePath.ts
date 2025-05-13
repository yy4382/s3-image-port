import {
  baseLocale,
  extractLocaleFromUrl,
  strategy,
} from "@/paraglide/runtime.js";

export function getRouterBasepath(pathname?: string): string | undefined {
  const extractedLocale = extractLocaleFromUrl(
    new URL(pathname ?? "/", "https://example.com"),
  );
  if (!strategy.includes("url") || !extractedLocale) {
    return undefined;
  }
  if (extractedLocale === baseLocale) {
    return undefined;
  }
  return `/${extractedLocale}`;
}
