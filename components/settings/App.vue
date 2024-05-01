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
    <UFormGroup
      :label="$t('settings.app.convert.title')"
      :description="$t('settings.app.convert.description')"
    >
      <USelectMenu v-model="appSettings.convertType" :options="convertTypes" />
    </UFormGroup>
    <UFormGroup :label="$t('settings.app.keyTemplate.title')">
      <div class="flex gap-2">
        <div class="flex-auto">
          <UInput
            v-model="appSettings.keyTemplate"
            :placeholder="defaultKeyTemplate"
          />
        </div>
        <UButton
          icon="i-mingcute-close-line"
          color="red"
          size="xs"
          v-if="!isDefaultKeyTemplate"
          @click="appSettings.keyTemplate = defaultKeyTemplate"
        />
      </div>
      <template #description>
        <div>
          <span class="inline-flex items-center">
            {{ $t("settings.app.keyTemplate.description") }}
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
        </div>
      </template>
    </UFormGroup>
  </div>
</template>
