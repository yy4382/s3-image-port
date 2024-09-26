<template>
  <div
    class="fixed top-0 bottom-0 left-0 right-0 -z-10"
    style="
      background-image: url(&quot;data:image/svg+xml;base64,PHN2ZyB4bWxucz0naHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmcnIHZpZXdCb3g9JzAgMCAzMiAzMicgd2lkdGg9JzMyJyBoZWlnaHQ9JzMyJyBmaWxsPSdub25lJyBzdHJva2U9J3JnYigxNSAyMyA0MiAvIDAuMDQpJz48cGF0aCBkPSdNMCAuNUgzMS41VjMyJy8+PC9zdmc+&quot;);
      mask-image: linear-gradient(transparent, black, transparent);
    "
  ></div>
  <ClientOnly>
    <div class="min-h-screen flex flex-col dark:bg-surface-800 gap-4">
      <NavMenu />
      <NuxtPage
        class="flex-grow"
        :transition="{
          name: 'my',
          mode: 'out-in',
          onBeforeEnter,
        }"
      />
      <FooterComp />
    </div>
  </ClientOnly>
  <UNotifications />
</template>

<script setup lang="ts">
useSeoMeta({
  title: "S3 Image Port",
  description:
    "A dashboard to manage your images in S3 buckets. Can be used as a image hosting service.",
  ogTitle: "S3 Image Port",
  ogDescription: "A dashboard to manage your images in S3 buckets.",
  ogImage: "https://iport.yfi.moe/cover.png",
  ogUrl: "https://iport.yfi.moe",
  ogSiteName: "S3 Image Port",
  twitterTitle: "S3 Image Port",
  twitterDescription: "A dashboard to manage your images in S3 buckets.",
  twitterImage: "https://iport.yfi.moe/cover.png",
  twitterCard: "summary_large_image",
});

useHead({
  htmlAttrs: {
    lang: "en",
  },
  link: [
    {
      rel: "icon",
      type: "image/svg+xml",
      href: "/favicon.svg",
    },
  ],
});

const { finalizePendingLocaleChange } = useI18n();

const onBeforeEnter = async () => {
  await finalizePendingLocaleChange();
};
</script>

<style>
.my-enter-active,
.my-leave-active {
  transition: opacity 0.3s;
}
.my-enter-from,
.my-leave-to {
  opacity: 0;
  filter: blur(1rem);
}
</style>
