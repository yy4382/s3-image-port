<template>
  <UContainer class="w-full">
    <nav class="flex items-center justify-between h-16 gap-2">
      <div class="flex-1 justify-start flex items-center gap-2">
        <Icon
          name="i-mingcute-photo-album-fill"
          class="text-3xl text-primary"
        />
        <span class="text-xl font-bold hidden md:block">S3 Image Port</span>
      </div>
      <div class="flex space-x-4 font-semibold">
        <ULink
          :to="localePath('/')"
          class="flex flex-row items-center gap-1"
          active-class="text-primary"
          inactive-class="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
        >
          <UIcon name="i-mingcute-upload-3-fill" />
          <span>{{ $t("upload.title") }}</span>
        </ULink>
        <ULink
          :to="localePath('/photos')"
          class="flex flex-row items-center gap-1"
          active-class="text-primary"
          inactive-class="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
        >
          <UIcon name="i-mingcute-photo-album-fill" />
          <span> {{ $t("photos.title") }}</span>
        </ULink>
        <ULink
          :to="localePath('/settings')"
          class="flex flex-row items-center gap-1"
          active-class="text-primary"
          inactive-class="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
        >
          <UIcon name="i-mingcute-settings-3-fill" />
          <span>{{ $t("settings.title") }} </span>
        </ULink>
      </div>
      <div class="flex-1 flex justify-end items-center gap-1">
        <UPopover>
          <UButton
            icon="i-mingcute-translate-2-fill"
            size="md"
            color="primary"
            square
            variant="ghost"
          />
          <template #panel>
            <div class="flex flex-col p-3 gap-2">
              <UButton
                v-for="locale in locales"
                :key="locale.code"
                :padded="false"
                variant="link"
                class="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:no-underline"
                :disabled="$i18n.locale === locale.code"
                @click.prevent.stop="setLocale(locale.code)"
              >
                {{ locale.name }}
              </UButton>
            </div>
          </template>
        </UPopover>
        <UButton
          icon="i-mingcute-github-fill"
          size="md"
          color="primary"
          square
          variant="ghost"
          target="_blank"
          to="https://github.com/yy4382/s3-image-port"
        />
      </div>
    </nav>
  </UContainer>
</template>

<script setup lang="ts">
const { locales, setLocale } = useI18n();
const localePath = useLocalePath();
</script>
