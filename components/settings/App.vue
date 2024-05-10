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
    <UFormGroup
      :label="$t('settings.app.compress.title')"
      :description="$t('settings.app.compress.description')"
    >
      <div class="flex flex-row gap-2">
        <!--TODO: optimize layout; limit range of number input-->
        <UInput
          :placeholder="$t('settings.app.compress.options.maxSize.title')"
          type="number"
        >
          <template #trailing>
            <span class="text-gray-500 dark:text-gray-400 text-xs">MB</span>
          </template>
        </UInput>
        <UInput
          :placeholder="
            $t('settings.app.compress.options.maxWidthOrHeight.title')
          "
          type="number"
        >
          <template #trailing>
            <span class="text-gray-500 dark:text-gray-400 text-xs">px</span>
          </template>
        </UInput>
      </div>
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
                <UCard
                  :ui="{
                    body: {
                      base: 'max-w-[90vw] w-[40rem] space-y-3',
                    },
                  }"
                >
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
