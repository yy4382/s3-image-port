<template>
  <UContainer
    class="max-w-4xl lg:max-w-[60rem] w-full flex flex-col justify-center"
  >
    <div
      class="w-full flex flex-col md:flex-row gap-12 md:gap-12 lg:gap-16 items-center px-8 md:px-0"
    >
      <div class="flex flex-col space-y-4 items-start justify-center md:w-full">
        <div class="text-5xl font-extrabold text-gray-800 dark:text-gray-200">
          S3 Image Port
        </div>
        <div
          class="text-6xl font-black bg-clip-text text-transparent bg-gradient-to-br from-primary-400 to-primary-600"
        >
          {{ $t("index.slogan") }}
        </div>
        <br />
        <div class="flex flex-col space-y-2">
          <p class="text-2xl text-gray-700 dark:text-gray-300">
            {{ $t("index.description") }}
          </p>
          <p class="text-xl text-gray-600 dark:text-gray-400">
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
    </div>
  </UContainer>
</template>

<script lang="ts" setup>
const localePath = useLocalePath();
</script>
