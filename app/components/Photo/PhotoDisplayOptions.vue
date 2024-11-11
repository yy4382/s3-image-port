<template>
  <div class="flex gap-2">
    <label for="search" class="sr-only">
      {{ $t("photos.displayOptions.search.label") }}
    </label>
    <UInput
      id="search"
      v-model="searchTerm"
      icon="i-heroicons-magnifying-glass-20-solid"
      :placeholder="$t('photos.displayOptions.search.placeholder')"
    />
    <UChip :show="numberOfFilters > 0" :text="numberOfFilters" size="lg">
      <UButton
        icon="i-mingcute-filter-line"
        :aria-label="$t('photos.displayOptions.filter.title')"
        @click="openFilter = true"
      />
    </UChip>
    <UButton
      :icon="
        galleryState.filterOptions.sort.orderIsDesc
          ? 'i-mingcute-sort-descending-line'
          : 'i-mingcute-sort-ascending-line'
      "
      :color="openSort ? 'primary' : 'gray'"
      :aria-label="$t('photos.displayOptions.sort.title')"
      @click="openSort = true"
    />

    <UModal v-model="openFilter">
      <UCard>
        <template #header>
          <div class="flex items-center justify-between">
            <h1 class="text-base font-semibold">
              {{ $t("photos.displayOptions.filter.title") }}
            </h1>
            <UButton
              color="gray"
              variant="ghost"
              icon="i-heroicons-x-mark-20-solid"
              class="-my-1"
              :aria-label="$t('photos.displayOptions.filter.close')"
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
            v-model="galleryState.filterOptions.prefix"
            searchable
            :options="availablePrefixes4Display"
            :placeholder="
              $t('photos.displayOptions.filter.prefixFilter.placeholder')
            "
            value-attribute="prefix"
            option-attribute="display"
          >
            <template #option="{ option }">
              <span
                :style="{ paddingLeft: option.indentation + 'rem' }"
                class="truncate"
              >
                {{ option.display }}
              </span>
            </template>
          </USelectMenu>
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
                selectedAllTime
                  ? $t(
                      "photos.displayOptions.filter.dateFilter.calendar.labels.allTime",
                    )
                  : getDateRangeString(galleryState.filterOptions.dateRange)
              }}
            </UButton>

            <template #panel="{ close }">
              <div
                class="flex items-center sm:divide-x divide-gray-200 dark:divide-gray-800"
              >
                <div class="hidden sm:flex flex-col py-4">
                  <UButton
                    v-for="(range, index) in timeRanges"
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
                    @click="
                      galleryState.filterOptions.dateRange = {
                        start: sub(new Date(), range.duration),
                        end: new Date(),
                      }
                    "
                  />
                </div>

                <DatePicker
                  v-model="galleryState.filterOptions.dateRange"
                  :locale="$i18n.locale === 'zh' ? 'zh-CN' : 'en'"
                  @close="close"
                />
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
              <h1 class="text-base font-semibold">
                {{ $t("photos.displayOptions.sort.title") }}
              </h1>
              <p class="text-gray-500 dark:text-gray-400 text-sm">
                {{ $t("photos.displayOptions.sort.description") }}
              </p>
            </div>
            <UButton
              color="gray"
              variant="ghost"
              icon="i-heroicons-x-mark-20-solid"
              class="-my-1"
              :aria-label="$t('photos.displayOptions.sort.close')"
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
                v-model="galleryState.filterOptions.sort.by"
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
                v-model="galleryState.filterOptions.sort.orderIsDesc"
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
import { zhCN, enUS } from "date-fns/locale";

const { t, locale } = useI18n();

const galleryState = useGalleryStateStore();

const openFilter = ref(false);
const openSort = ref(false);

// Three filters: search, prefix, date

// search
const searchTerm = ref("");
const debouncedSearchTerm = refDebounced(searchTerm, 300);
watch(debouncedSearchTerm, () => {
  galleryState.filterOptions.searchTerm = debouncedSearchTerm.value;
});

// prefix
const availablePrefixes: ComputedRef<string[]> = computed(() => [
  "",
  ...new Set(
    galleryState.imageAll.flatMap((photo) => {
      const parts = photo.Key.split("/");
      return parts
        .slice(0, -1)
        .map((_, index) => parts.slice(0, index + 1).join("/"));
    }),
  ),
]);
const availablePrefixes4Display = computed(() =>
  availablePrefixes.value.map((prefix) => ({
    prefix,
    display:
      prefix === ""
        ? t("photos.displayOptions.filter.prefixFilter.noPrefixPlaceholder")
        : prefix,
    indentation: (prefix.match(/\//g) || []).length,
  })),
);

// date

/**
 * Range that should be seen as "all time"
 */
const allTimeRange: Duration = { years: 1000 };

const selectedAllTime = computed(() => isRangeSelected(allTimeRange));

// prettier-ignore
const timeRanges = [
  {
    label: t("photos.displayOptions.filter.dateFilter.calendar.labels.last7Days"),
    duration: { days: 7 },
  },
  {
    label: t("photos.displayOptions.filter.dateFilter.calendar.labels.last14Days"),
    duration: { days: 14 },
  },
  {
    label: t("photos.displayOptions.filter.dateFilter.calendar.labels.last30Days"),
    duration: { days: 30 },
  },
  {
    label: t("photos.displayOptions.filter.dateFilter.calendar.labels.last3Months"),
    duration: { months: 3 },
  },
  {
    label: t("photos.displayOptions.filter.dateFilter.calendar.labels.last6Months"),
    duration: { months: 6 },
  },
  {
    label: t("photos.displayOptions.filter.dateFilter.calendar.labels.lastYear"),
    duration: { years: 1 },
  },
  {
    label: t("photos.displayOptions.filter.dateFilter.calendar.labels.allTime"),
    duration: allTimeRange,
  },
];

const getDateRangeString = (dateRange: { start: Date; end: Date }) => {
  const localeForDateFns = locale.value === "zh" ? zhCN : enUS;
  const formatString =
    localeForDateFns === zhCN ? "yyyy 年 M 月 d 日" : "d MMM, yyyy";
  const formattedDate = (date: Date) =>
    format(date, formatString, {
      locale: localeForDateFns,
    });
  return `${formattedDate(dateRange.start)} - ${formattedDate(dateRange.end)}`;
};
function isRangeSelected(duration: Duration) {
  const { dateRange } = galleryState.filterOptions;
  return (
    isSameDay(dateRange.start, sub(new Date(), duration)) &&
    isSameDay(dateRange.end, new Date())
  );
}

const sortByOptions = ["key", "date"];

/**
 * Number of filters applied
 * Used for the badge on the filter button
 */
const numberOfFilters = computed(() => {
  let count = 0;
  if (galleryState.filterOptions.prefix !== "") ++count;
  if (!selectedAllTime.value) ++count;
  return count;
});
</script>
