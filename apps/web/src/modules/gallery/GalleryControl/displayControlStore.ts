import {
  type Duration,
  endOfDay,
  format,
  parse,
  startOfDay,
  sub,
} from "date-fns";
import { atom } from "jotai";
import { z } from "zod";
import deepEqual from "deep-equal";

const OptDefault = {
  searchTerm: "",
  prefix: undefined,
  dateRangeType: [null, null],
  sortBy: "key",
  sortOrder: "desc",
} as const satisfies DisplayOptions;

export { OptDefault as displayOptionsDefault };

export function timeRangesGetter(): { duration: Duration; type: string }[] {
  return [
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
  ];
}

export const displayOptionsSchema = z.object({
  searchTerm: z.string().default("").catch(""),
  prefix: z.string().optional().catch(undefined),
  dateRangeType: z
    .enum([...timeRangesGetter().map((t) => t.type)])
    .or(z.tuple([z.coerce.date().nullable(), z.coerce.date().nullable()]))
    .default([null, null])
    .catch([null, null]),
  sortBy: z.enum(["key", "date"]).catch("key").default("key"),
  sortOrder: z.enum(["asc", "desc"]).catch("desc").default("desc"),
});

export type DisplayOptions = z.infer<typeof displayOptionsSchema>;

export const displayOptionsAtom = atom<DisplayOptions>(OptDefault);

export function displayOptionsToSearchParams(options: DisplayOptions) {
  const params = new URLSearchParams();
  const { searchTerm, prefix, dateRangeType, sortBy, sortOrder } = options;
  if (searchTerm !== OptDefault.searchTerm) {
    params.set("searchTerm", searchTerm);
  }
  if (prefix !== OptDefault.prefix) {
    params.set("prefix", prefix);
  }
  if (!deepEqual(dateRangeType, OptDefault.dateRangeType)) {
    if (typeof dateRangeType === "string") {
      params.set("dateRangeType", dateRangeType);
    } else {
      const stored = dateRangeType.map((d) =>
        d ? format(d, "yyyy-MM-ddX") : null,
      );
      params.set("dateRangeType", JSON.stringify(stored));
    }
  }
  if (sortBy !== OptDefault.sortBy) {
    params.set("sortBy", sortBy);
  }
  if (sortOrder !== OptDefault.sortOrder) {
    params.set("sortOrder", sortOrder);
  }
  return params;
}

export function searchParamsToDisplayOptions(params: URLSearchParams) {
  const searchTerm = params.get("searchTerm");
  const prefix = params.get("prefix");
  const dateRangeTypeRaw = params.get("dateRangeType");
  const sortBy = params.get("sortBy");
  const sortOrder = params.get("sortOrder");

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
