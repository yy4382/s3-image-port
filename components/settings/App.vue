<script setup lang="ts">
import { type ConvertType, type AppSettings, convertTypes } from "~/types";
import { useStorage } from "@vueuse/core";
const appSettings: Ref<AppSettings> = useStorage("app-settings", {
  convertType: "none",
  pubUrl: "",
});
</script>

<template>
  <div class="space-y-4">
    <UFormGroup label="Convert image before upload">
      <USelectMenu v-model="appSettings.convertType" :options="convertTypes" />
    </UFormGroup>
    <UFormGroup label="Public URL Pattern">
      <UInput v-model="appSettings.pubUrl" label="Public URL" />
    </UFormGroup>
  </div>
</template>
