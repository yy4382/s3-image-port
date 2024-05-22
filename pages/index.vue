<template>
  <UContainer
    class="max-w-4xl lg:max-w-[60rem] w-full flex flex-col justify-center"
  >
    <div
      class="w-full flex flex-col md:flex-row gap-12 md:gap-12 lg:gap-16 items-center px-8 md:px-0"
    >
      <div
        class="flex flex-col space-y-4 items-start justify-center md:w-[66%]"
      >
        <h1 class="text-4xl text-primary-500 dark:text-primary-400">
          S3 Image Port
        </h1>
        <h2 class="text-5xl font-medium text-gray-800 dark:text-gray-200">
          {{ $t("index.slogan") }}
        </h2>
        <div class="flex flex-col space-y-2">
          <p class="text-xl text-gray-700 dark:text-gray-300">
            {{ $t("index.description") }}
          </p>
          <p class="text-gray-600 dark:text-gray-400">
            {{ $t("index.comment") }}
          </p>
        </div>
        <div class="flex flex-wrap gap-4 pt-6">
          <UButton
            color="primary"
            variant="solid"
            :to="localePath('/upload')"
            icon="i-mingcute-play-fill"
          >
            {{ $t("index.actions.haveATry") }}
          </UButton>
          <UButton
            color="blue"
            variant="solid"
            to="https://docs.iport.yfi.moe"
            icon="i-mingcute-book-2-fill"
          >
            {{ $t("index.actions.readTheDocs") }}
          </UButton>
          <UButton
            color="gray"
            variant="solid"
            to="https://github.com/yy4382/s3-image-port"
            icon="i-mingcute-github-fill"
          >
            {{ $t("index.actions.viewOnGithub") }}
          </UButton>
        </div>
      </div>
      <div class="relative md:w-[34%] flex justify-start">
        <div class="w-48 h-48">
          <img src="~/public/favicon.svg" alt="logo" class="w-48 h-48" />
          <img
            src="~/public/favicon.svg"
            alt="logo"
            draggable="false"
            class="w-72 h-72 absolute top-1/2 left-1/2 -translate-x-[64%] -translate-y-1/2 blur-3xl opacity-0 hover:opacity-50 dark:hover:opacity-25 transition-opacity duration-700 ease-in-out"
          />
        </div>
      </div>
    </div>
  </UContainer>
</template>

<script lang="ts" setup>
const localePath = useLocalePath();
</script>
