// https://nuxt.com/docs/api/configuration/nuxt-config
import path from "path";
export default defineNuxtConfig({
  devtools: { enabled: true },
  modules: ["@nuxtjs/tailwindcss", "nuxt-primevue"],
  primevue: {
    // unstyled: true,
    importPT: { from: path.resolve(__dirname, "./presets/lara/") }, //import and apply preset
  },
  css: ["primeicons/primeicons.css"],
  nitro: {
    preset: "vercel-edge",
  },
  runtimeConfig: {
    s3Config: {
      endpoint: '',
      accKeyId: '',
      secretAccKey: '',
      bucket: '',
      region: '',
    },
    token: '',
  }
});
