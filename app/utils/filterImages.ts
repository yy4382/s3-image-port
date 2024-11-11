import type { AppSettings, Photo } from "~/types";
import { compareAsc, compareDesc, sub, intervalToDuration } from "date-fns";
import Fuse from "fuse.js";

export type FilterOptions = {
  searchTerm: string;
  prefix: string;
  dateRange: { start: Date; end: Date };
  dateRangeType: (typeof TIME_RANGES)[number]["type"] | "custom";
  sort: {
    by: "key" | "date";
    orderIsDesc: boolean;
  };
};

export const ALL_TIME_RANGE = {
  start: new Date(0),
  end: new Date(2100, 0),
};
export const ALL_TIME_DURATION = intervalToDuration(ALL_TIME_RANGE);

export const DEFAULT_FILTER_OPTIONS: FilterOptions = {
  searchTerm: "",
  prefix: "",
  dateRange: ALL_TIME_RANGE,
  dateRangeType: "all",
  sort: {
    by: "key",
    orderIsDesc: true,
  },
};

const filterByPrefix = (images: Photo[], prefix: string) =>
  images.filter((image) => image.Key.startsWith(prefix));

const filterByDateRange = (
  images: Photo[],
  dateRange: FilterOptions["dateRange"],
) =>
  images.filter((photo) => {
    const date = new Date(photo.LastModified);
    return date >= dateRange.start && date <= dateRange.end;
  });

const sortTrivial = (
  images: Photo[],
  by: "key" | "date",
  orderIsDesc: boolean,
) => {
  if (by === "key") {
    return images
      .slice()
      .sort((a, b) =>
        !orderIsDesc ? a.Key.localeCompare(b.Key) : b.Key.localeCompare(a.Key),
      );
  } else {
    // assert sortBy.value === "date"
    return images
      .slice()
      .sort((a, b) =>
        !orderIsDesc
          ? compareAsc(new Date(a.LastModified), new Date(b.LastModified))
          : compareDesc(new Date(a.LastModified), new Date(b.LastModified)),
      );
  }
};

const sortSearch = (
  images: Photo[],
  options: FilterOptions,
  appSettings: Pick<AppSettings, "enableFuzzySearch" | "fuzzySearchThreshold">,
) => {
  if (!appSettings.enableFuzzySearch)
    // not enabled, use simple search
    return images.filter((photo) =>
      photo.Key.includes(options.searchTerm.trim()),
    );

  const results = new Fuse(images, {
    keys: ["Key"],
    threshold: appSettings.fuzzySearchThreshold,
    useExtendedSearch: true,
  }).search(options.searchTerm.trim());
  const keys = results.map((result) => result.item.Key);
  const searchResultPhotos = images.filter((photo) => keys.includes(photo.Key));
  return searchResultPhotos.sort(
    (a, b) => keys.indexOf(a.Key) - keys.indexOf(b.Key),
  );
};

export default function filterImages(
  images: Photo[],
  options: FilterOptions,
  appSettings: Pick<AppSettings, "enableFuzzySearch" | "fuzzySearchThreshold">,
) {
  const filteredImages = filterByDateRange(
    filterByPrefix(images, options.prefix),
    options.dateRange,
  );
  if (options.searchTerm.trim()) {
    return sortSearch(filteredImages, options, appSettings);
  }
  return sortTrivial(filteredImages, options.sort.by, options.sort.orderIsDesc);
}

export const TIME_RANGES = [
  {
    duration: { days: 7 },
    type: "7d",
  },
  {
    duration: { days: 14 },
    type: "14d",
  },
  {
    duration: { days: 30 },
    type: "30d",
  },
  {
    duration: { months: 3 },
    type: "3m",
  },
  {
    duration: { months: 6 },
    type: "6m",
  },
  {
    duration: { years: 1 },
    type: "1y",
  },
  {
    duration: ALL_TIME_DURATION,
    type: "all",
  },
] as const satisfies { duration: Duration; type: string }[];

// MARK: Persisting filter options

export const FILTER_LOCALSTORAGE_KEY = "s3pi:filterOptions";

export function loadOptions(
  searchParam: URLSearchParams,
  localstorage: Record<string, string>,
): FilterOptions | undefined {
  return (
    loadOptionsWithType((x) => searchParam.get(x) ?? undefined) ??
    loadOptionsWithType((x) => localstorage[x])
  );
}

function loadOptionsWithType(
  getter: (x: string) => string | undefined,
): FilterOptions | undefined {
  let dateRangeType = getter("dateRangeType");
  const searchTerm = getter("searchTerm") ?? "";
  const prefix = getter("prefix") ?? "";
  let sortby = getter("sortby");
  let sortOrder = getter("sortOrder");
  if (![dateRangeType, searchTerm, prefix, sortby, sortOrder].some(Boolean)) {
    return;
  }

  if (sortby !== "key" && sortby !== "date") {
    sortby = "key";
  }
  if (sortOrder !== "asc" && sortOrder !== "desc") {
    sortOrder = "desc";
  }

  let dateRange: FilterOptions["dateRange"] | undefined = undefined;

  const dateRangeStart = getter("dateRangeStart");
  const dateRangeEnd = getter("dateRangeEnd");
  if (dateRangeType === "custom" && dateRangeStart && dateRangeEnd) {
    dateRange = {
      start: new Date(dateRangeStart),
      end: new Date(dateRangeEnd),
    };
  } else if (
    dateRangeType &&
    (TIME_RANGES.map((r) => r.type) as string[]).includes(dateRangeType)
  ) {
    const duration = TIME_RANGES.find(
      (r) => r.type === dateRangeType,
    )!.duration;
    dateRange = {
      start: sub(new Date(), duration),
      end: new Date(),
    };
  } else {
    dateRangeType = "all";
    dateRange = ALL_TIME_RANGE;
  }

  return {
    searchTerm,
    prefix,
    dateRangeType: dateRangeType as FilterOptions["dateRangeType"],
    dateRange,
    sort: {
      by: sortby as "key" | "date",
      orderIsDesc: sortOrder === "desc",
    },
  };
}

export function saveOptions(options: FilterOptions) {
  const toBeSaved: Record<string, string> = {};
  const setter = (x: string, y: string | undefined) => {
    if (!y) return;
    toBeSaved[x] = y;
  };

  if (options.searchTerm !== DEFAULT_FILTER_OPTIONS.searchTerm)
    setter("searchTerm", options.searchTerm);

  if (options.prefix !== DEFAULT_FILTER_OPTIONS.prefix)
    setter("prefix", options.prefix);

  if (options.dateRangeType !== DEFAULT_FILTER_OPTIONS.dateRangeType)
    setter("dateRangeType", options.dateRangeType);

  if (options.dateRangeType === "custom") {
    setter("dateRangeStart", options.dateRange.start.toISOString());
    setter("dateRangeEnd", options.dateRange.end.toISOString());
  }
  if (options.sort.by !== DEFAULT_FILTER_OPTIONS.sort.by)
    setter("sortby", options.sort.by);

  if (options.sort.orderIsDesc !== DEFAULT_FILTER_OPTIONS.sort.orderIsDesc)
    setter("sortOrder", options.sort.orderIsDesc ? "desc" : "asc"); // always save "asc" because "desc" is default

  // return and let caller (component) to update the URL and localstorage
  return toBeSaved;
}
