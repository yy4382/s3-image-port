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
    <UAlert title="What is Profile?">
      <template #description>
        <div class="flex flex-col gap-1">
          <p>Profile is a snapshot of your current settings.</p>
          <p>
            You can save your current settings as a profile, or load a profile
            to restore your settings.
          </p>
          <p>
            If you change your current settings, profile will not be affected.
          </p>
        </div>
      </template>
    </UAlert>
    <UFormGroup label="Load from Clipboard into Current Settings">
      <UButton @click="handleImportSettings">Import Settings</UButton>
    </UFormGroup>
    <UFormGroup label="Save Current Settings into Profile">
      <div class="flex gap-2 items-center">
        <UInput v-model="newName" placeholder="new profile name" />
        <UButton @click="newName && settingsStore.saveProfile(newName)"
          >Save Profile</UButton
        >
      </div>
    </UFormGroup>
    <UDivider />
    <UAlert title="Profile Actions">
      <template #description>
        <div class="flex flex-col gap-1">
          <p>Load: load this profile to current settings.</p>
          <p>Save: save current settings as this profile.</p>
          <p>Delete: delete this profile. This action cannot be undone.</p>
          <p>Copy: copy this profile to clipboard.</p>
        </div>
      </template>
    </UAlert>
    <div class="flex flex-col gap-2">
      <h2 class="text-2xl">Profiles</h2>
      <div v-if="settingsStore.profiles.length === 0">
        No profiles saved yet.
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
            >Load</UButton
          >
          <UButton
            variant="outline"
            size="xs"
            @click="settingsStore.saveProfile(profile.name)"
            >Save</UButton
          >
          <UButton
            variant="outline"
            size="xs"
            @click="settingsStore.deleteProfile(profile.name)"
            >Delete</UButton
          >
          <UButton
            variant="outline"
            size="xs"
            @click="() => handleExportSettings(profile.name)"
            >Copy</UButton
          >
        </div>
      </div>
    </div>
  </div>
</template>
