// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  devtools: { enabled: true },
  modules: ["@nuxt/ui", "@vueuse/nuxt", "@nuxtjs/i18n"],
  ui: {
    icons: ["mingcute"],
  },
  i18n: {
    locales: [
      {
        code: "en",
        flag: "us",
        iso: "en-US",
        file: "en.json",
        name: "English",
      },
      {
        code: "zh",
        flag: "cn",
        iso: "zh-CN",
        file: "zh.json",
        name: "中文",
      },
    ],
    defaultLocale: "en",
    strategy: "prefix_except_default",
    langDir: "locales",
    detectBrowserLanguage: {
      useCookie: true,
      fallbackLocale: 'en',
      alwaysRedirect: false,
      redirectOn: "root",
    },
  },
});
