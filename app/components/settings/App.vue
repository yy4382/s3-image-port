<template>
  <UForm :state="state" :schema="appSettingsSchema" class="space-y-4 mt-4">
    <!--auto refresh switch-->
    <div class="flex justify-between">
      <UFormGroup
        :label="$t('settings.app.autoRefresh.title')"
        :description="$t('settings.app.autoRefresh.description')"
        name="enableAutoRefresh"
        class="basis-3/4"
      />
      <div class="flex flex-col justify-center">
        <UToggle
          v-model="state.enableAutoRefresh"
          on-icon="i-heroicons-check-20-solid"
          off-icon="i-heroicons-x-mark-20-solid"
        />
      </div>
    </div>
    <!--fuzzy search switch-->
    <div class="flex justify-between">
      <UFormGroup
        :label="$t('settings.app.fuzzySearch.title')"
        :description="$t('settings.app.fuzzySearch.description')"
        name="enableFuzzySearch"
        class="basis-3/4"
      />
      <div class="flex flex-col justify-center">
        <UToggle
          v-model="state.enableFuzzySearch"
          on-icon="i-heroicons-check-20-solid"
          off-icon="i-heroicons-x-mark-20-solid"
        />
      </div>
    </div>
    <!--fuzzy search threshold-->
    <UFormGroup
      v-if="state.enableFuzzySearch"
      :label="$t('settings.app.fuzzySearchThreshold.title')"
      :description="$t('settings.app.fuzzySearchThreshold.description')"
      name="fuzzySearchThreshold"
    >
      <div class="flex gap-2">
        <UAlert>
          <template #description>
            <div class="flex gap-4">
              <URange
                v-model="state.fuzzySearchThreshold"
                :min="0"
                :max="1"
                :step="0.1"
                :disabled="!state.enableFuzzySearch"
                class="basis-11/12"
              />
              <span class="basis-1/12">{{ state.fuzzySearchThreshold }}</span>
            </div>
          </template>
        </UAlert>
      </div>
    </UFormGroup>
    <!--convert-->
    <UFormGroup
      :label="$t('settings.app.convert.title')"
      :description="$t('settings.app.convert.description')"
      name="convertType"
    >
      <USelectMenu v-model="state.convertType" :options="selectMenuOptions" />
    </UFormGroup>
    <!--compress-->
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
    <!--key template-->
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
                  <UAlert
                    icon="i-heroicons-exclamation-triangle"
                    color="red"
                    :title="
                      $t('settings.app.keyTemplate.moreInfo.warning.title')
                    "
                    :description="
                      $t(
                        'settings.app.keyTemplate.moreInfo.warning.description',
                      )
                    "
                  />
                  <UAlert
                    :title="
                      $t('settings.app.keyTemplate.moreInfo.placeholders.title')
                    "
                    :description="
                      $t(
                        'settings.app.keyTemplate.moreInfo.placeholders.description',
                      )
                    "
                  />
                  <p>
                    {{
                      $t("settings.app.keyTemplate.moreInfo.learnMore.part1")
                    }}
                    <ULink
                      to="https://github.com/yy4382/s3-image-port/blob/main/README.md#special-note-on-key-path-template"
                      inactive-class="underline underline-offset-2 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
                      target="_blank"
                    >
                      {{
                        $t("settings.app.keyTemplate.moreInfo.learnMore.part2")
                      }}
                    </ULink>
                    {{
                      $t("settings.app.keyTemplate.moreInfo.learnMore.part3")
                    }}
                  </p>
                </UCard>
              </template>
            </UPopover>
          </span>
        </div>
      </template>
    </UFormGroup>
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

<script setup lang="ts">
import { convertTypes, appSettingsSchema } from "~/types";
import { defaultKeyTemplate } from "~/utils/uploadObj";

const { app: state } = storeToRefs(useSettingsStore());
const isDefaultKeyTemplate = computed(
  () =>
    state.value.keyTemplate === defaultKeyTemplate ||
    state.value.keyTemplate === "",
);
const selectMenuOptions = computed(() => convertTypes.map((type) => type));
</script>
