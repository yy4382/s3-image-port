import { type Duration } from "date-fns";
import { z } from "zod";

const OptDefault = {
  searchTerm: "",
  prefix: undefined,
  dateRangeType: [null, null],
  sortBy: "key",
  sortOrder: "desc",
} as const satisfies GalleryFilterOptions;

export { OptDefault as galleryFilterDefault };

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

export const galleryFilterSchema = z.object({
  searchTerm: z.string().default(""),
  prefix: z.string().optional(),
  dateRangeType: z
    .enum([...timeRangesGetter().map((t) => t.type)])
    .or(z.tuple([z.coerce.date().nullable(), z.coerce.date().nullable()]))
    .default([null, null]),
  sortBy: z.enum(["key", "date"]).default("key").catch("key"),
  sortOrder: z.enum(["asc", "desc"]).default("desc").catch("desc"),
});

export type GalleryFilterOptions = z.infer<typeof galleryFilterSchema>;

export const galleryFilterSearchParamsSchema = z.object({
  searchTerm: z.string().optional().catch(undefined),
  prefix: z.string().optional().catch(undefined),
  dateRangeType: z.string().optional().catch(undefined),
  sortBy: z.string().optional().catch(undefined),
  sortOrder: z.string().optional().catch(undefined),
});
