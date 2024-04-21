<template>
  <div class="min-h-screen flex flex-col dark:bg-surface-800 gap-4">
    <NavMenu />
    <NuxtPage class="flex-grow" />
    <FooterComp />
  </div>
  <UNotifications />
</template>

<script setup lang="ts">
useSeoMeta({
  title: "S3 Image Port",
  description: "A dashboard to manage your images in S3 buckets. Can be used as a image hosting service.",
  ogTitle: "S3 Image Port",
  ogDescription: "A dashboard to manage your images in S3 buckets.",
  ogImage: "/cover.png",
  ogUrl: "https://iport.yfi.moe",
  twitterTitle: "S3 Image Port",
  twitterDescription: "A dashboard to manage your images in S3 buckets.",
  twitterImage: "/cover.png",
  twitterCard: "summary_large_image",
});

useHead({
  htmlAttrs: {
    lang: "en",
  },
  link: [
    {
      rel: "icon",
      type: "image/x-icon",
      href: "/favicon.ico",
    },
  ],
});
</script>
