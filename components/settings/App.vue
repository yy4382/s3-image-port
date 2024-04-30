<script setup lang="ts">
import { type ConvertType, type AppSettings, convertTypes } from "~/types";
import { useStorage } from "@vueuse/core";
import { defaultKeyTemplate } from "~/utils/uploadObj";
const appSettings: Ref<AppSettings> = useStorage("app-settings", {
  convertType: "none",
  keyTemplate: defaultKeyTemplate,
});
const isDefaultKeyTemplate = computed(
  () => appSettings.value.keyTemplate === defaultKeyTemplate
);
</script>

<template>
  <div class="space-y-4">
    <UFormGroup :label="$t('settings.app.convert.title')">
      <USelectMenu v-model="appSettings.convertType" :options="convertTypes" />
      <template #help>
        {{ $t("settings.app.convert.help") }}
      </template>
    </UFormGroup>
    <UFormGroup :label="$t('settings.app.keyTemplate.title')">
      <UInput v-model="appSettings.keyTemplate" />
      <template #help>
        <div>
          <span class="inline-flex items-center">
            {{ $t("settings.app.keyTemplate.help") }}
            <UPopover mode="hover">
              <UButton
                icon="i-mingcute-information-line"
                size="2xs"
                color="primary"
                square
                variant="link"
              />
              <template #panel>
                <UCard>
                  <p>{{ $t("settings.app.keyTemplate.placeholders") }}</p>
                  <p>{{ $t("settings.app.keyTemplate.default") }}</p>
                  <p class="text-red-500">
                    {{ $t("settings.app.keyTemplate.warning") }}
                  </p>
                  <p>{{ $t("settings.app.keyTemplate.info1") }}</p>
                </UCard>
              </template>
            </UPopover>
          </span>
          <UButton
            label="Reset Key Template"
            color="red"
            size="xs"
            v-if="!isDefaultKeyTemplate"
            @click="appSettings.keyTemplate = defaultKeyTemplate"
          />
        </div>
      </template>
    </UFormGroup>
  </div>
</template>
