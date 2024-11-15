<script lang="ts" setup>
const { t } = useI18n();
const localePath = useLocalePath();
const links = computed(() => [
  [
    {
      label: t("settings.profiles.title"),
      to: localePath("/settings/profiles"),
    },
    {
      label: t("settings.s3.title"),
      to: localePath("/settings/s3"),
    },
    {
      label: t("settings.app.titles.upload"),
      to: localePath("/settings/upload"),
    },
    {
      label: t("settings.app.titles.gallery"),
      to: localePath("/settings/gallery"),
    },
    {
      label: t("settings.app.titles.misc"),
      to: localePath("/settings/misc"),
    },
  ],
]);
</script>

<template>
  <div class="size-full flex gap-4 flex-col md:flex-row">
    <div class="flex flex-col gap-8">
      <div class="flex flex-row items-center justify-between">
        <h1 class="flex flex-row items-center gap-1 text-lg font-semibold">
          <UIcon name="i-mingcute-settings-3-fill" />
          {{ $t("settings.title") }}
        </h1>
      </div>
      <UVerticalNavigation
        :links="links"
        class="min-w-[10rem]"
        :aria-label="$t('a11y.settings.list')"
      />
    </div>
    <div class="w-full max-w-md mx-auto">
      <slot />
    </div>
  </div>
</template>
