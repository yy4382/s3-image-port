import type { AppSettings, Photo } from "~/types";
import { compareAsc, compareDesc, sub } from "date-fns";
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
  appSettings: AppSettings,
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
  appSettings: AppSettings,
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

export const ALL_TIME_RANGE: Duration = { years: 1000 };
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
    duration: ALL_TIME_RANGE,
    type: "all",
  },
] as const;

export const FILTER_LOCALSTORAGE_KEY = "s3pi:filterOptions";

export function loadOptions(
  searchParam: URLSearchParams,
  localstorage: Record<string, string>,
): FilterOptions | undefined {
  return (
    loadOptionsWithType((x) => searchParam.get(x)) ??
    loadOptionsWithType((x) => localstorage[x] ?? null)
  );
}

function loadOptionsWithType(
  getter: (x: string) => string | null,
): FilterOptions | undefined {
  let dateRangeType = getter("dateRangeType") ?? undefined;
  const searchTerm = getter("searchTerm") ?? "";
  const prefix = getter("prefix") ?? "";
  let sortby = getter("sortby") ?? undefined;
  let sortOrder = getter("sortOrder") ?? undefined;
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
    dateRange = {
      start: sub(new Date(), ALL_TIME_RANGE),
      end: new Date(),
    };
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

  setter("searchTerm", options.searchTerm);
  setter("prefix", options.prefix);
  setter(
    "dateRangeType",
    options.dateRangeType === "all" ? undefined : options.dateRangeType,
  );
  if (options.dateRangeType === "custom") {
    setter("dateRangeStart", options.dateRange.start.toISOString());
    setter("dateRangeEnd", options.dateRange.end.toISOString());
  }
  setter("sortby", options.sort.by === "date" ? "date" : undefined);
  setter("sortOrder", options.sort.orderIsDesc ? undefined : "asc");

  // return and let caller (component) to update the URL
  return toBeSaved;
}
