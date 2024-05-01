<script setup lang="ts">
import { type ConvertType, type AppSettings, convertTypes } from "~/types";
import { useStorage } from "@vueuse/core";
import { defaultKeyTemplate } from "~/utils/uploadObj";
const appSettings: Ref<AppSettings> = useStorage("app-settings", {
  convertType: "none",
  keyTemplate: "",
});
const isDefaultKeyTemplate = computed(
  () =>
    appSettings.value.keyTemplate === defaultKeyTemplate ||
    appSettings.value.keyTemplate === ""
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
        <UTooltip
          :text="$t('settings.app.keyTemplate.reset')"
          v-if="!isDefaultKeyTemplate"
        >
          <UButton
            icon="i-mingcute-close-circle-line"
            color="red"
            size="xs"
            square
            @click="appSettings.keyTemplate = ''"
          />
        </UTooltip>
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
