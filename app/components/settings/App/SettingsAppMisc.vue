<script setup lang="ts">
import { appMiscSettingsSchema } from "~/types";

const { app: state } = storeToRefs(useSettingsStore());
</script>

<template>
  <UForm :state="state" :schema="appMiscSettingsSchema" class="space-y-4 mt-4">
    <div class="flex justify-between">
      <UFormGroup
        :label="$t('settings.app.noLongerShowRootPage.title')"
        :description="$t('settings.app.noLongerShowRootPage.description')"
        name="noLongerShowRootPage"
        class="basis-3/4"
      />
      <div class="flex flex-col justify-center">
        <UToggle
          v-model="state.noLongerShowRootPage"
          on-icon="i-heroicons-check-20-solid"
          off-icon="i-heroicons-x-mark-20-solid"
        />
      </div>
    </div>
  </UForm>
</template>
