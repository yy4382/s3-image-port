<template>
  <UContainer
    class="max-w-4xl lg:max-w-[60rem] w-full flex flex-col justify-center"
  >
    <div
      class="w-full flex flex-col md:flex-row gap-12 md:gap-12 lg:gap-16 items-center px-8 md:px-0"
    >
      <div
        class="flex flex-col space-y-4 items-center justify-center md:w-full"
      >
        <div
          class="text-center text-5xl md:text-6xl lg:text-8xl font-black bg-clip-text text-transparent bg-gradient-to-br from-primary-400 to-primary-600 pb-2"
        >
          <span class="text-gray-800 dark:text-inherit">{{
            $t("index.slogan.part1")
          }}</span>
          <span>{{ $t("index.slogan.part2") }}</span>
          <br />
          <span class="text-gray-800 dark:text-inherit">{{
            $t("index.slogan.part3")
          }}</span>
        </div>
        <div class="flex flex-col space-y-2">
          <p
            class="text-center text-base md:text-xl lg:text-2xl text-gray-700 dark:text-gray-300"
          >
            {{ $t("index.description") }}
          </p>
          <p
            class="text-center text-sm md:text-base lg:text-xl text-gray-600 dark:text-gray-400"
          >
            {{ $t("index.comment") }}
          </p>
        </div>
        <div
          class="flex flex-wrap gap-2 sm:gap-4 md:pt-6 justify-center items-center"
        >
          <UButton
            color="primary"
            variant="solid"
            :to="localePath('/upload')"
            icon="i-mingcute-rocket-fill"
            :size="width < 640 ? 'xs' : 'md'"
          >
            {{ $t("index.actions.getStarted") }}
          </UButton>
          <UButton
            color="blue"
            variant="solid"
            to="https://docs.iport.yfi.moe"
            icon="i-mingcute-book-2-fill"
            :size="width < 640 ? 'xs' : 'md'"
          >
            {{ $t("index.actions.readDocs") }}
          </UButton>
          <UButton
            v-if="width >= 640"
            color="gray"
            variant="solid"
            to="https://github.com/yy4382/s3-image-port"
            icon="i-mingcute-github-fill"
          >
            {{ $t("index.actions.viewSource") }}
          </UButton>
        </div>
      </div>
    </div>
  </UContainer>
</template>

<script lang="ts" setup>
const localePath = useLocalePath();
const { width } = useWindowSize();
</script>
