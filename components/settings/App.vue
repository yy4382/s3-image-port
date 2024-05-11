<script setup lang="ts">
import { convertTypes, appSettingsSchema } from "~/types";

import { defaultKeyTemplate } from "~/utils/uploadObj";

const { appSettings: state } = useSettings();

const isDefaultKeyTemplate = computed(
  () =>
    state.value.keyTemplate === defaultKeyTemplate ||
    state.value.keyTemplate === ""
);
const selectMenuOptions = computed(() => convertTypes.map((type) => type));
</script>

<template>
  <UForm :state="state" :schema="appSettingsSchema" class="space-y-4">
    <UFormGroup
      :label="$t('settings.app.convert.title')"
      :description="$t('settings.app.convert.description')"
      name="convertType"
    >
      <USelectMenu v-model="state.convertType" :options="selectMenuOptions" />
    </UFormGroup>
    <div>
      <div class="flex content-center items-center justify-between text-sm">
        {{ $t("settings.app.compress.title") }}
      </div>
      <p class="text-gray-500 dark:text-gray-400 text-sm">
        {{ $t("settings.app.compress.description") }}
      </p>
      <div class="flex flex-row gap-2 mt-1">
        <UFormGroup name="compressionMaxSize">
          <UInput
            v-model="state.compressionMaxSize"
            :placeholder="$t('settings.app.compress.options.maxSize.title')"
            type="number"
            min="0"
          >
            <template #trailing>
              <span class="text-gray-500 dark:text-gray-400 text-xs">MB</span>
            </template>
          </UInput>
        </UFormGroup>
        <UFormGroup name="compressionMaxWidthOrHeight">
          <UInput
            v-model="state.compressionMaxWidthOrHeight"
            :placeholder="
              $t('settings.app.compress.options.maxWidthOrHeight.title')
            "
            type="number"
            min="1"
          >
            <template #trailing>
              <span class="text-gray-500 dark:text-gray-400 text-xs">px</span>
            </template>
          </UInput>
        </UFormGroup>
      </div>
    </div>
    <UFormGroup
      :label="$t('settings.app.keyTemplate.title')"
      name="keyTemplate"
    >
      <div class="flex gap-2">
        <div class="flex-auto">
          <UInput
            v-model="state.keyTemplate"
            :placeholder="defaultKeyTemplate"
          />
        </div>
        <UTooltip
          v-if="!isDefaultKeyTemplate"
          :text="$t('settings.app.keyTemplate.reset')"
        >
          <UButton
            icon="i-mingcute-close-circle-line"
            color="red"
            size="xs"
            square
            @click="state.keyTemplate = ''"
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
  </UForm>
</template>
