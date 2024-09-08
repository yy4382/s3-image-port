<script setup lang="ts">
import { gallerySettingsSchema } from "~/types";

const { app: state } = storeToRefs(useSettingsStore());
</script>

<template>
  <UForm :state="state" :schema="gallerySettingsSchema" class="space-y-4 mt-4">
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
  </UForm>
</template>
