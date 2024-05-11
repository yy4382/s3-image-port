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
      <div class="flex space-x-4">
        <ULink
          :to="localePath('/')"
          active-class="text-primary"
          inactive-class="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
        >
          {{ $t("upload.title") }}</ULink
        >
        <ULink
          :to="localePath('/photos')"
          active-class="text-primary"
          inactive-class="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
          >{{ $t("photos.title") }}</ULink
        >
        <ULink
          :to="localePath('/settings')"
          active-class="text-primary"
          inactive-class="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
          >{{ $t("settings.title") }}</ULink
        >
      </div>
      <div class="flex-1 flex justify-end items-center gap-1">
        <USelectMenu
          icon="i-mingcute-translate-2-line"
          :options="locales"
          v-model="localeSelected"
          @change="localeRedirect"
        ></USelectMenu>
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
const i18n = useI18n();
const localePath = useLocalePath();
const locales = ["English", "简体中文"];
const localeSelected = ref(
  i18n.getBrowserLocale() === "zh" ? "简体中文" : "English"
);
let locale = i18n.getBrowserLocale() === "zh" ? "zh" : "en";

const localeRedirect = () => {
  console.log("Locale to " + localeSelected.value);
  if (localeSelected.value === "English") {
    locale = "en";
  } else if (localeSelected.value === "简体中文") {
    locale = "zh";
  } else {
    // assert false;
  }
  i18n.setLocale(locale);
};
</script>
