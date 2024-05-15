<template>
  <div class="flex gap-2">
    <UInput
      v-model="searchTerm"
      icon="i-heroicons-magnifying-glass-20-solid"
      :placeholder="$t('photos.displayOptions.search.placeholder')"
    />
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
      :icon="
        sortOrderIsDescending
          ? 'i-mingcute-sort-descending-line'
          : 'i-mingcute-sort-ascending-line'
      "
      :color="openSort ? 'primary' : 'gray'"
      @click="openSort = true"
    />

    <UModal v-model="openFilter">
      <UCard>
        <template #header>
          <div class="flex items-center justify-between">
            <h3 class="text-base font-semibold">
              {{ $t("photos.displayOptions.filter.title") }}
            </h3>
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
          <UFormGroup
            :label="$t('photos.displayOptions.filter.prefixFilter.title')"
            :description="
              $t('photos.displayOptions.filter.prefixFilter.description')
            "
          />
          <USelectMenu
            v-model="prefix"
            searchable
            :options="availablePrefixes"
            :placeholder="
              $t('photos.displayOptions.filter.prefixFilter.placeholder')
            "
          />
          <UDivider />
          <UFormGroup
            :label="$t('photos.displayOptions.filter.dateFilter.title')"
            :description="
              $t('photos.displayOptions.filter.dateFilter.description')
            "
            class="hidden md:block"
          />
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
          <div class="md:hidden">
            {{
              $t("photos.displayOptions.filter.dateFilter.notAvailableOnMobile")
            }}
          </div>
        </div>
      </UCard>
    </UModal>
    <UModal v-model="openSort">
      <UCard>
        <template #header>
          <div class="flex items-center justify-between">
            <div class="flex flex-col">
              <h3 class="text-base font-semibold">
                {{ $t("photos.displayOptions.sort.title") }}
              </h3>
              <p class="text-gray-500 dark:text-gray-400 text-sm">
                {{ $t("photos.displayOptions.sort.description") }}
              </p>
            </div>
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
          <div class="flex flex-row gap-4 justify-between">
            <div class="flex flex-col justify-center">
              <UFormGroup
                :label="$t('photos.displayOptions.sort.sortBy.title')"
                :description="
                  $t('photos.displayOptions.sort.sortBy.description')
                "
              />
            </div>
            <div class="flex flex-col justify-center">
              <USelectMenu
                v-model="sortBy"
                :options="sortByOptions"
                :disabled="searchTerm.trim() !== ''"
              />
            </div>
          </div>
          <div class="flex flex-row gap-4 justify-between">
            <UFormGroup
              :label="$t('photos.displayOptions.sort.order.title')"
              :description="$t('photos.displayOptions.sort.order.description')"
            />
            <div class="flex flex-col justify-center">
              <!--TODO: optimize design (the current version is ugly)-->
              <UToggle
                v-model="sortOrderIsDescending"
                on-icon="i-mingcute-sort-descending-line"
                off-icon="i-mingcute-sort-ascending-line"
                :disabled="searchTerm.trim() !== ''"
                size="2xl"
              />
            </div>
          </div>
        </div>
      </UCard>
    </UModal>
  </div>
</template>

<script lang="ts" setup>
import { sub, format, isSameDay, type Duration } from "date-fns";
import type { SortByOpts } from "~/types";
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
const sortOrderIsDescending = defineModel<boolean>("sortOrderIsDescending", {
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
