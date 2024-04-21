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
      <div class="inline-flex items-center justify-between w-full dark:text-gray-400 text-gray-600 text-sm">
        <span>© 2024 <a href="https://yfi.moe">Yunfi</a><br>Powered by Nuxt & Nuxt UI. Hosted on Vercel.</span>
        <span>Source at <a href="https://github.com/yy4382/s3-image-port">GitHub</a></span>
      </div>
    </UCard>
  </UContainer>
</template>
