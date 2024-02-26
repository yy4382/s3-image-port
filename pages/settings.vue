<template>
  <Card class="w-96 m-auto">
    <template #title>
      <h2>Settings</h2>
    </template>
    <template #content>
      <div class="flex flex-col gap-8">
        <FloatLabel>
          <InputText
            id="endpoint"
            v-model="s3Settings.endpoint"
            class="w-full"
          />
          <label for="endpoint">Endpoint</label>
        </FloatLabel>
        <FloatLabel>
          <InputText id="bucket" v-model="s3Settings.bucket" class="w-full" />
          <label for="bucket">Bucket Name</label>
        </FloatLabel>
        <FloatLabel>
          <InputText id="region" v-model="s3Settings.region" class="w-full" />
          <label for="region">Region</label>
        </FloatLabel>
        <FloatLabel>
          <InputText
            id="accKeyId"
            v-model="s3Settings.accKeyId"
            class="w-full"
          />
          <label for="accKeyId">Access Key ID</label>
        </FloatLabel>
        <FloatLabel>
          <InputText
            id="secretAccKey"
            v-model="s3Settings.secretAccKey"
            class="w-full"
          />
          <label for="secretAccKey">Secret Access Key</label>
        </FloatLabel>
        <div class="flex flex-col">
          <label
            class="ml-3 -translate-y-1 text-[rgb(var(--surface-900)/0.6)] text-sm"
            for="convert"
          >
            Convert to
          </label>
          <Dropdown
            id="convert"
            v-model="s3Settings.convert"
            :options="convertType"
          />
        </div>
        <Button label="Submit" @click="save" />
      </div>
    </template>
  </Card>
</template>

<script setup lang="ts">
import { ref } from "vue";
import { type Settings, DEFAULT_SETTINGS, convertType } from "../types";
const s3Settings = ref<Settings>(DEFAULT_SETTINGS);
onMounted(() => {
  s3Settings.value = Object.assign(
    {},
    DEFAULT_SETTINGS,
    JSON.parse(localStorage.getItem("settings") || "{}"),
  );
});
const save = () => {
  localStorage.setItem("settings", JSON.stringify(s3Settings.value));
};
</script>
