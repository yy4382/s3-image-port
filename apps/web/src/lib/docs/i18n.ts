import { defineI18n } from "fumadocs-core/i18n";
import { routing } from "@/i18n/routing";

export const i18n = defineI18n({
  defaultLanguage: routing.defaultLocale,
  languages: routing.locales.slice(),
  parser: "dot",
});
