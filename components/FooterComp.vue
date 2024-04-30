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
      <div
        class="inline-flex items-center justify-between w-full dark:text-gray-400 text-gray-600 text-sm"
      >
        <span>
          Copyright © 2024
          <ULink
            to="https://yfi.moe"
            inactive-class="text-primary-500 dark:text-primary-400 hover:text-primary-600 dark:hover:text-primary-500 hover:underline hover:underline-offset-2 transition-colors"
            >Yunfi</ULink
          >
          <br />
          Powered by
          <ULink
            to="https://nuxt.com/"
            inactive-class="text-primary-500 dark:text-primary-400 hover:text-primary-600 dark:hover:text-primary-500 hover:underline hover:underline-offset-2 transition-colors"
            >Nuxt</ULink
          >
          &
          <ULink
            to="https://ui.nuxt.com/"
            inactive-class="text-primary-500 dark:text-primary-400 hover:text-primary-600 dark:hover:text-primary-500 hover:underline hover:underline-offset-2 transition-colors"
            >Nuxt UI</ULink
          >.
          {{ hostingProvider ? `Hosted on ${hostingProvider}.` : "" }}
        </span>
        <span
          >Source at
          <ULink
            to="https://github.com/yy4382/s3-image-port"
            inactive-class="text-primary hover:underline"
            >GitHub</ULink
          ></span
        >
      </div>
    </UCard>
  </UContainer>
</template>

<script setup lang="ts">
const { data: hostingProvider } = await useAsyncData(
  "hostingProvider",
  async () => {
    if (process.env.NETLIFY) {
      console.log("Running on Netlify");
      return "Netlify";
    } else if (process.env.VERCEL) {
      console.log("Running on Vercel");
      return "Vercel";
    } else {
      console.log("Running on unknown hosting provider");
      return undefined;
    }
  }
);
</script>
