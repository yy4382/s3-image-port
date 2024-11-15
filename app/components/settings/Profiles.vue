<script lang="ts" setup>
const settingsStore = useSettingsStore();
const { copy, isSupported } = useClipboard();
const { t } = useI18n();
const toast = useToast();

const handleExportSettings = async (profile: string) => {
  if (!isSupported) {
    const toast = useToast();
    toast.add({
      title: t("settings.importExport.clipboard.unsupported"),
      description: t("settings.importExport.clipboard.unsupported_description"),
      color: "red",
    });
    return;
  }
  const settingsText = settingsStore.exportSettings(profile);
  await copy(JSON.stringify(settingsText, null, 2));
  toast.add({
    title: t("settings.importExport.success"),
    color: "green",
  });
};
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

const newName = ref("");
</script>

<template>
  <div class="flex flex-col gap-4">
    <UAlert :title="$t('settings.profiles.what-is-profile')">
      <template #description>
        <div class="flex flex-col gap-1">
          <p>{{ $t("settings.profiles.what-is.1") }}</p>
          <p>{{ $t("settings.profiles.what-is.2") }}</p>
          <p>{{ $t("settings.profiles.what-is.3") }}</p>
        </div>
      </template>
    </UAlert>
    <UFormGroup :label="$t('settings.profiles.import.desc')">
      <UButton @click="handleImportSettings">{{
        $t("settings.profiles.import.btn")
      }}</UButton>
    </UFormGroup>
    <UFormGroup :label="$t('settings.profiles.save.desc')">
      <div class="flex gap-2 items-center">
        <UInput
          v-model="newName"
          :placeholder="$t('settings.profiles.save.placeholder')"
        />
        <UButton @click="newName && settingsStore.saveProfile(newName)">{{
          $t("settings.profiles.save.btn")
        }}</UButton>
      </div>
    </UFormGroup>
    <UDivider />
    <UAlert :title="$t('settings.profiles.action.title')">
      <template #description>
        <div class="flex flex-col gap-1">
          <p>{{ $t("settings.profiles.action.desc.load") }}</p>
          <p>{{ $t("settings.profiles.action.desc.save") }}</p>
          <p>{{ $t("settings.profiles.action.desc.delete") }}</p>
          <p>{{ $t("settings.profiles.action.desc.copy") }}</p>
        </div>
      </template>
    </UAlert>
    <div class="flex flex-col gap-2">
      <h2 class="text-2xl">{{ $t("settings.profiles.title") }}</h2>
      <div v-if="settingsStore.profiles.length === 0">
        {{ $t("settings.profiles.no-profiles-saved-yet") }}
      </div>
      <div
        v-for="profile in settingsStore.profiles"
        :key="profile.name"
        class="flex justify-between border dark:border-gray-600 p-2 rounded-md items-center"
      >
        <div>{{ profile.name }}</div>
        <div class="flex gap-2">
          <UButton
            variant="outline"
            size="xs"
            @click="settingsStore.loadProfile(profile.name)"
            >{{ $t("settings.profiles.action.load") }}</UButton
          >
          <UButton
            variant="outline"
            size="xs"
            @click="settingsStore.saveProfile(profile.name)"
            >{{ $t("settings.profiles.action.save") }}</UButton
          >
          <UButton
            variant="outline"
            size="xs"
            @click="settingsStore.deleteProfile(profile.name)"
            >{{ $t("settings.profiles.action.delete") }}</UButton
          >
          <UButton
            variant="outline"
            size="xs"
            @click="() => handleExportSettings(profile.name)"
            >{{ $t("settings.profiles.action.copy") }}</UButton
          >
        </div>
      </div>
    </div>
  </div>
</template>
