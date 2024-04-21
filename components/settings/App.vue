<script setup lang="ts">
import { type ConvertType, type AppSettings, convertTypes } from "~/types";
import { useStorage } from "@vueuse/core";
const appSettings: Ref<AppSettings> = useStorage("app-settings", {
  convertType: "none",
});
</script>

<template>
  <div class="space-y-4">
    <UFormGroup label="Convert image before upload">
      <USelectMenu v-model="appSettings.convertType" :options="convertTypes" />
      <template #help>
        Convert image before uploading to S3. "none" will not do conversion.
      </template>
    </UFormGroup>
  </div>
</template>
