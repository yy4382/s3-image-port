<script lang="ts" setup>
import {
  ALL_TIME_RANGE,
  TIME_RANGES,
  type FilterOptions,
} from "~/utils/filterImages";
import { isSameDay, sub } from "date-fns";
const { t } = useI18n();
defineEmits(["close"]);

const galleryState = useGalleryStateStore();

function setDateRange(rangeType: FilterOptions["dateRangeType"]) {
  if (rangeType === "custom") {
    galleryState.$patch((state) => {
      state.filterOptions.dateRangeType = "custom";
    });
    return;
  }
  if (rangeType === "all") {
    galleryState.$patch((state) => {
      state.filterOptions.dateRange = ALL_TIME_RANGE;
      state.filterOptions.dateRangeType = "all";
    });
    return;
  }
  galleryState.$patch((state) => {
    state.filterOptions.dateRangeType = rangeType;
    state.filterOptions.dateRange = {
      start: sub(
        new Date(),
        TIME_RANGES.find((range) => range.type === rangeType)!.duration,
      ),
      end: new Date(),
    };
  });
}

watch(
  () => galleryState.filterOptions.dateRange,
  (newVal) => {
    function setType(rangeType: FilterOptions["dateRangeType"]) {
      if (rangeType !== galleryState.filterOptions.dateRangeType) {
        galleryState.filterOptions.dateRangeType = rangeType;
      }
    }

    if (isSameDay(newVal.end, ALL_TIME_RANGE.end)) {
      setType("all");
      return;
    }
    for (const range of TIME_RANGES.filter((range) => range.type !== "all")) {
      if (
        isSameDay(newVal.start, sub(new Date(), range.duration)) &&
        isSameDay(newVal.end, new Date())
      ) {
        setType(range.type);
        return;
      }
    }
    setType("custom");
  },
  { deep: true },
);
</script>

<template>
  <div
    class="flex flex-col-reverse sm:flex-row items-start sm:divide-x divide-gray-200 dark:divide-gray-800"
  >
    <div class="flex flex-col py-4 w-full sm:w-[unset]">
      <UButton
        v-for="(range, index) in [{ type: 'custom' }, ...TIME_RANGES] as const"
        :key="index"
        :label="
          t(
            'photos.displayOptions.filter.dateFilter.calendar.labels.' +
              range.type,
          )
        "
        color="gray"
        variant="ghost"
        class="rounded-none px-6"
        :class="[
          galleryState.filterOptions.dateRangeType === range.type
            ? 'bg-gray-100 dark:bg-gray-800'
            : 'hover:bg-gray-50 dark:hover:bg-gray-800/50',
        ]"
        truncate
        @click="() => setDateRange(range.type)"
      />
    </div>

    <DatePicker
      v-if="galleryState.filterOptions.dateRangeType === 'custom'"
      v-model="galleryState.filterOptions.dateRange"
      :locale="$i18n.locale === 'zh' ? 'zh-CN' : 'en'"
      @close="() => $emit('close')"
    />
  </div>
</template>
