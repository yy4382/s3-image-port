<script lang="ts" setup>
import { useClipboard } from "@vueuse/core";
const toast = useToast();
const { t } = useI18n();
const localePath = useLocalePath();
const links = computed(() => [
  [
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

const settingsStore = useSettingsStore();
const { copy, isSupported } = useClipboard();

// Add these lines
const handleImportSettings = async () => {
  if (!isSupported) {
    toast.add({
      title: t("settings.importExport.clipboard.unsupported"),
      description: t("settings.importExport.clipboard.unsupported_description"),
      color: "red",
    });
    return;
  }
  const clipboardData = await navigator.clipboard.readText();
  try {
    const settings = JSON.parse(clipboardData);
    settingsStore.importSettings(settings);
    toast.add({
      title: t("settings.importExport.success"),
      color: "green",
    });
  } catch (error) {
    if (error instanceof Error) {
      toast.add({
        title: t("settings.importExport.invalid"),
        description: error.message,
        color: "red",
      });
    }
  }
};

const handleExportSettings = async () => {
  if (!isSupported) {
    const toast = useToast();
    toast.add({
      title: t("settings.importExport.clipboard.unsupported"),
      description: t("settings.importExport.clipboard.unsupported_description"),
      color: "red",
    });
    return;
  }
  const settings = settingsStore.exportSettings();
  await copy(JSON.stringify(settings, null, 2));
  toast.add({
    title: t("settings.importExport.success"),
    color: "green",
  });
};
</script>

<template>
  <div class="size-full flex gap-4 flex-col md:flex-row">
    <div class="flex flex-col gap-8">
      <div class="flex flex-row items-center justify-between">
        <h1 class="flex flex-row items-center gap-1 text-lg font-semibold">
          <UIcon name="i-mingcute-settings-3-fill" />
          {{ $t("settings.title") }}
        </h1>
        <div class="flex gap-1">
          <UButton
            size="xs"
            variant="ghost"
            color="gray"
            icon="i-mingcute-copy-2-fill"
            :aria-label="$t('a11y.settings.importExport.export')"
            @click="handleExportSettings"
          />
          <UButton
            size="xs"
            variant="ghost"
            color="gray"
            icon="i-mingcute-download-fill"
            :aria-label="$t('a11y.settings.importExport.import')"
            @click="handleImportSettings"
          />
        </div>
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
