import { endOfDay, format, parse, startOfDay, sub } from "date-fns";
import { z } from "zod";
import deepEqual from "fast-deep-equal";
import {
  type GalleryFilterOptions,
  galleryFilterSchema,
  galleryFilterDefault,
  timeRangesGetter,
} from "@/stores/schemas/gallery/filter";
import {
  DEFAULT_PAGE_SIZE,
  PAGE_SIZE_OPTIONS,
  type GalleryPageSize,
} from "@/stores/atoms/gallery";

const pageSizeSchema = z.coerce
  .number()
  .pipe(z.literal(PAGE_SIZE_OPTIONS))
  .optional()
  .catch(undefined);

export const galleryFilterSearchParamsSchema = z.object({
  searchTerm: z.string().optional().catch(undefined),
  prefix: z.string().optional().catch(undefined),
  dateRangeType: z.string().optional().catch(undefined),
  sortBy: z.string().optional().catch(undefined),
  sortOrder: z.string().optional().catch(undefined),
  pageSize: pageSizeSchema,
});

export function galleryFilterOptionsToSearchParams(
  options: GalleryFilterOptions,
  pageSize: GalleryPageSize = DEFAULT_PAGE_SIZE,
): z.infer<typeof galleryFilterSearchParamsSchema> {
  const params: z.infer<typeof galleryFilterSearchParamsSchema> = {};
  const { searchTerm, prefix, dateRangeType, sortBy, sortOrder } = options;
  if (searchTerm !== galleryFilterDefault.searchTerm) {
    params.searchTerm = searchTerm;
  }
  if (prefix !== galleryFilterDefault.prefix) {
    params.prefix = prefix;
  }
  if (!deepEqual(dateRangeType, galleryFilterDefault.dateRangeType)) {
    if (typeof dateRangeType === "string") {
      params.dateRangeType = dateRangeType;
    } else {
      const stored = dateRangeType.map((d) =>
        d ? format(d, "yyyy-MM-ddX") : null,
      );
      params.dateRangeType = JSON.stringify(stored);
    }
  }
  if (sortBy !== galleryFilterDefault.sortBy) {
    params.sortBy = sortBy;
  }
  if (sortOrder !== galleryFilterDefault.sortOrder) {
    params.sortOrder = sortOrder;
  }
  if (pageSize !== DEFAULT_PAGE_SIZE) {
    params.pageSize = pageSize;
  }
  return params;
}

export function galleryFilterOptionsFromSearchParams(
  params: z.infer<typeof galleryFilterSearchParamsSchema>,
): GalleryFilterOptions {
  const {
    searchTerm,
    prefix,
    dateRangeType: dateRangeTypeRaw,
    sortBy,
    sortOrder,
  } = params;

  let dateRangeType: GalleryFilterOptions["dateRangeType"];
  if (dateRangeTypeRaw) {
    if (
      timeRangesGetter()
        .map((r) => r.type as string)
        .includes(dateRangeTypeRaw)
    ) {
      dateRangeType = dateRangeTypeRaw as GalleryFilterOptions["dateRangeType"];
    } else {
      try {
        const parsed = z
          .tuple([z.string().nullable(), z.string().nullable()])
          .parse(JSON.parse(dateRangeTypeRaw));
        const [from, to] = [startOfDay, endOfDay].map((f, i) =>
          parsed[i] ? f(parse(parsed[i], "yyyy-MM-ddX", new Date())) : null,
        );
        dateRangeType = [from, to];
      } catch {
        dateRangeType = [null, null];
      }
    }
  } else {
    dateRangeType = [null, null];
  }
  return galleryFilterSchema.parse({
    searchTerm,
    prefix,
    dateRangeType,
    sortBy,
    sortOrder,
  });
}

/**
 * Transform a date range type (e.g. "7d") to a date range [from, to]
 */
export function getTimeRange(
  type: GalleryFilterOptions["dateRangeType"],
): [Date | null, Date | null] {
  if (Array.isArray(type)) {
    return type;
  } else {
    const selectedRange = timeRangesGetter().find((r) => r.type === type);
    if (selectedRange) {
      const to = new Date();
      const from = sub(to, selectedRange.duration);
      return [from, to];
    }
  }
  return [null, null];
}
