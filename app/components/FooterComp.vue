<template>
  <UContainer class="w-full pb-2 sm:pb-3 lg:pb-4">
    <UCard
      :ui="{
        body: {
          base: '',
          background: '',
          padding: 'px-2 py-2 sm:p-2 sm:px-4',
        },
      }"
    >
      <footer
        class="inline-flex items-center justify-between w-full dark:text-gray-400 text-gray-600 text-sm"
      >
        <p>
          Copyright © 2024
          <ULink
            to="https://yfi.moe"
            inactive-class="text-primary-500 dark:text-primary-400 hover:text-primary-600 dark:hover:text-primary-500 hover:underline hover:underline-offset-2 transition-colors"
            :aria-label="$t('a11y.footer.yunfi')"
            >Yunfi</ULink
          >.
          <br />
          Powered by
          <ULink
            to="https://nuxt.com/"
            inactive-class="text-primary-500 dark:text-primary-400 hover:text-primary-600 dark:hover:text-primary-500 hover:underline hover:underline-offset-2 transition-colors"
            :aria-label="$t('a11y.footer.nuxt')"
            >Nuxt</ULink
          >
          &
          <ULink
            to="https://ui.nuxt.com/"
            inactive-class="text-primary-500 dark:text-primary-400 hover:text-primary-600 dark:hover:text-primary-500 hover:underline hover:underline-offset-2 transition-colors"
            :aria-label="$t('a11y.footer.nuxt-ui')"
            >Nuxt UI</ULink
          >.
          <span class="hidden md:inline-block" aria-hidden="true">
            {{ hostingProvider ? `Hosted on ${hostingProvider}.` : "" }}
          </span>
        </p>
        <span class="hidden md:inline-flex gap-4">
          <ULink
            :to="localePath('/?noredirect=true')"
            class="hover:text-primary-600 dark:hover:text-primary-500 hover:underline hover:underline-offset-2 transition-colors"
            :aria-label="$t('a11y.footer.home')"
            >Home</ULink
          >
          <ULink
            to="https://github.com/yy4382/s3-image-port"
            class="hover:text-primary-600 dark:hover:text-primary-500 hover:underline hover:underline-offset-2 transition-colors"
            :aria-label="$t('a11y.footer.github')"
            >GitHub</ULink
          ></span
        >
      </footer>
    </UCard>
  </UContainer>
</template>

<script setup lang="ts">
const { data: hostingProvider } = await useAsyncData(
  "hostingProvider",
  async () => {
    const hostEnvMap: { [propName: string]: string } = {
      NETLIFY: "Netlify",
      VERCEL: "Vercel",
      CF_PAGES: "Cloudflare Pages",
    };
    const env = Object.keys(hostEnvMap).find((key) => process.env[key]);
    return env ? hostEnvMap[env] : undefined;
  },
);
const localePath = useLocalePath();
</script>
