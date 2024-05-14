<template>
  <div class="flex gap-2">
    <UInput v-model="searchTerm" placeholder="Search" />
    <UChip :show="hasFilters">
      <UButton
        icon="i-mingcute-filter-line"
        @click="
          console.log(prefix !== '', !isRangeSelected({ years: 1000 }));
          openFilter = true;
        "
      />
    </UChip>
    <UButton
      icon="i-mingcute-sort-ascending-line"
      :color="openSort ? 'primary' : 'gray'"
      @click="openSort = true"
    />

    <UModal v-model="openFilter">
      <UCard>
        <template #header>
          <div class="flex items-center justify-between">
            <h3 class="text-base font-semibold">Filters</h3>
            <UButton
              color="gray"
              variant="ghost"
              icon="i-heroicons-x-mark-20-solid"
              class="-my-1"
              @click="openFilter = false"
            />
          </div>
        </template>
        <div class="flex flex-col gap-4">
          <UFormGroup label="Prefix">
            <USelectMenu
              v-model="prefix"
              searchable
              :options="availablePrefixes"
              placeholder="Prefix"
            />
          </UFormGroup>
          <UFormGroup label="Time" class="hidden md:block">
            <UPopover :popper="{ placement: 'bottom-start' }">
              <UButton icon="i-heroicons-calendar-days-20-solid">
                {{
                  isRangeSelected({ years: 1000 })
                    ? "All Time"
                    : format(dateRange.start, "d MMM, yyyy") +
                      "-" +
                      format(dateRange.end, "d MMM, yyyy")
                }}
              </UButton>

              <template #panel="{ close }">
                <div
                  class="flex items-center sm:divide-x divide-gray-200 dark:divide-gray-800"
                >
                  <div class="hidden sm:flex flex-col py-4">
                    <UButton
                      v-for="(range, index) in ranges"
                      :key="index"
                      :label="range.label"
                      color="gray"
                      variant="ghost"
                      class="rounded-none px-6"
                      :class="[
                        isRangeSelected(range.duration)
                          ? 'bg-gray-100 dark:bg-gray-800'
                          : 'hover:bg-gray-50 dark:hover:bg-gray-800/50',
                      ]"
                      truncate
                      @click="selectRange(range.duration)"
                    />
                  </div>

                  <DatePicker v-model="dateRange" @close="close" />
                </div>
              </template>
            </UPopover>
          </UFormGroup>
          <div class="md:hidden">Sorry, Calendar not supported on mobile.</div>
        </div>
      </UCard>
    </UModal>
    <UModal v-model="openSort">
      <UCard>
        <template #header>
          <div class="flex items-center justify-between">
            <h3 class="text-base font-semibold">Sort</h3>
            <UButton
              color="gray"
              variant="ghost"
              icon="i-heroicons-x-mark-20-solid"
              class="-my-1"
              @click="openSort = false"
            />
          </div>
        </template>
        <div class="flex flex-col gap-4">
          <UFormGroup label="Sort By">
            <USelectMenu
              v-if="!searchTerm"
              v-model="sortBy"
              :options="sortByOptions"
            />
          </UFormGroup>
          <UFormGroup label="Sort Order">
            <USelectMenu
              v-if="!searchTerm"
              v-model="sortOrder"
              :options="sortOrderOptions"
            />
          </UFormGroup>
        </div>
      </UCard>
    </UModal>
  </div>
</template>

<script lang="ts" setup>
import { sub, format, isSameDay, type Duration } from "date-fns";
import type { SortByOpts, SortOrderOpts } from "~/types";
const props = defineProps<{
  availablePrefixes: string[];
}>();
const { availablePrefixes } = toRefs(props);

const prefix = defineModel<string>("prefix", { required: true });
const searchTerm = defineModel<string>("searchTerm", { required: true });
const dateRange = defineModel<{ start: Date; end: Date }>("dateRange", {
  required: true,
  default: { start: sub(new Date(), { years: 1 }), end: new Date() },
});
const sortByOptions = ["key", "date"];
const sortBy = defineModel<SortByOpts>("sortBy", { required: true });
const sortOrderOptions = ["asc", "desc"];
const sortOrder = defineModel<SortOrderOpts>("sortOrder", {
  required: true,
});

const hasFilters = computed<boolean>(
  () => prefix.value !== "" || !isRangeSelected({ years: 1000 })
);

const openFilter = ref(false);
const openSort = ref(false);
const ranges = [
  { label: "Last 7 days", duration: { days: 7 } },
  { label: "Last 14 days", duration: { days: 14 } },
  { label: "Last 30 days", duration: { days: 30 } },
  { label: "Last 3 months", duration: { months: 3 } },
  { label: "Last 6 months", duration: { months: 6 } },
  { label: "Last year", duration: { years: 1 } },
  { label: "All time", duration: { years: 1000 } },
];

function isRangeSelected(duration: Duration) {
  return (
    isSameDay(dateRange.value.start, sub(new Date(), duration)) &&
    isSameDay(dateRange.value.end, new Date())
  );
}

function selectRange(duration: Duration) {
  dateRange.value = { start: sub(new Date(), duration), end: new Date() };
}
</script>
