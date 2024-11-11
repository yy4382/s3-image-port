import type { AppSettings, Photo } from "~/types";
import { compareAsc, compareDesc } from "date-fns";
import Fuse from "fuse.js";

export type FilterOptions = {
  searchTerm: string;
  prefix: string;
  dateRange: { start: Date; end: Date };
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
