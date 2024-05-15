export default function getLocale() {
  const i18n = useI18n();
  let locale = i18n.getLocaleCookie();
  if (locale === undefined) {
    locale = i18n.getBrowserLocale();
  }
  return locale;
}