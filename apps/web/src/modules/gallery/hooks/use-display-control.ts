import { endOfDay, format, parse, startOfDay, sub } from "date-fns";
import { z } from "zod";
import deepEqual from "deep-equal";
import {
  type GalleryFilterOptions as DisplayOptions,
  galleryFilterSearchParamsSchema as displayOptionsSearchSchema,
  galleryFilterSchema as displayOptionsSchema,
  galleryFilterDefault as OptDefault,
  timeRangesGetter,
} from "@/stores/schemas/gallery/filter";

export function displayOptionsToSearchParams(options: DisplayOptions) {
  const params: z.infer<typeof displayOptionsSearchSchema> = {};
  const { searchTerm, prefix, dateRangeType, sortBy, sortOrder } = options;
  if (searchTerm !== OptDefault.searchTerm) {
    params.searchTerm = searchTerm;
  }
  if (prefix !== OptDefault.prefix) {
    params.prefix = prefix;
  }
  if (!deepEqual(dateRangeType, OptDefault.dateRangeType)) {
    if (typeof dateRangeType === "string") {
      params.dateRangeType = dateRangeType;
    } else {
      const stored = dateRangeType.map((d) =>
        d ? format(d, "yyyy-MM-ddX") : null,
      );
      params.dateRangeType = JSON.stringify(stored);
    }
  }
  if (sortBy !== OptDefault.sortBy) {
    params.sortBy = sortBy;
  }
  if (sortOrder !== OptDefault.sortOrder) {
    params.sortOrder = sortOrder;
  }
  return params;
}

export function searchParamsToDisplayOptions(
  params: z.infer<typeof displayOptionsSearchSchema>,
) {
  const {
    searchTerm,
    prefix,
    dateRangeType: dateRangeTypeRaw,
    sortBy,
    sortOrder,
  } = params;

  let dateRangeType: DisplayOptions["dateRangeType"];
  if (dateRangeTypeRaw) {
    if (
      timeRangesGetter()
        .map((r) => r.type as string)
        .includes(dateRangeTypeRaw)
    ) {
      dateRangeType = dateRangeTypeRaw as DisplayOptions["dateRangeType"];
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
  return displayOptionsSchema.parse({
    searchTerm,
    prefix,
    dateRangeType,
    sortBy,
    sortOrder,
  });
}

export function getTimeRange(
  type: DisplayOptions["dateRangeType"],
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
