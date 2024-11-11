import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import type { Photo } from "~/types";
import {
  DEFAULT_FILTER_OPTIONS,
  loadOptions,
  saveOptions,
} from "~/utils/filterImages";

const MOCK_DATA: Photo[] = [
  {
    Key: "i/2023/05/05/zec5ut-2.webp",
    LastModified: "2024-04-25T02:30:42.198Z",
    url: "https://i.yfi.moe/i/2023/05/05/zec5ut-2.webp",
  },
  {
    Key: "i/2024/01/14/m90nuc-2.webp",
    LastModified: "2024-04-24T02:30:16.053Z",
    url: "https://i.yfi.moe/i/2024/01/14/m90nuc-2.webp",
  },
  {
    Key: "i/2024/01/14/maoa07-2.webp",
    LastModified: "2024-04-25T02:30:16.421Z",
    url: "https://i.yfi.moe/i/2024/01/14/maoa07-2.webp",
  },
  {
    Key: "i/2024/01/17/z5a8xq-2.webp",
    LastModified: "2024-04-25T02:30:40.970Z",
    url: "https://i.yfi.moe/i/2024/01/17/z5a8xq-2.webp",
  },
  {
    Key: "i/2024/04/19/2cm1jl.webp",
    LastModified: "2024-04-25T02:30:09.181Z",
    url: "https://i.yfi.moe/i/2024/04/19/2cm1jl.webp",
  },
  {
    Key: "i/2024/04/28/2wdb5-wq.png",
    LastModified: "2024-04-27T17:21:11.302Z",
    url: "https://i.yfi.moe/i/2024/04/28/2wdb5-wq.png",
  },
  {
    Key: "i/2024/04/28/2yo5d-7h.png",
    LastModified: "2024-05-11T10:37:49.274Z",
    url: "https://i.yfi.moe/i/2024/04/28/2yo5d-7h.png",
  },
  {
    Key: "i/2024/06/06/yy27b-vm.webp",
    LastModified: "2024-06-06T08:18:16.921Z",
    url: "https://i.yfi.moe/i/2024/06/06/yy27b-vm.webp",
  },
  {
    Key: "i/2024/06/24/1fbzqo-8q.webp",
    LastModified: "2024-06-24T15:57:01.479Z",
    url: "https://i.yfi.moe/i/2024/06/24/1fbzqo-8q.webp",
  },
  {
    Key: "i/2024/06/25/4m2y-w4.webp",
    LastModified: "2024-06-24T16:03:36.228Z",
    url: "https://i.yfi.moe/i/2024/06/25/4m2y-w4.webp",
  },
  {
    Key: "i/2024/08/04/un0o0-gr.webp",
    LastModified: "2024-08-04T06:18:03.289Z",
    url: "https://i.yfi.moe/i/2024/08/04/un0o0-gr.webp",
  },
  {
    Key: "i/2024/08/04/un8h3-2f.webp",
    LastModified: "2024-08-04T06:18:04.087Z",
    url: "https://i.yfi.moe/i/2024/08/04/un8h3-2f.webp",
  },
  {
    Key: "i/2024/08/04/un8qt-rb.webp",
    LastModified: "2024-08-04T06:18:03.476Z",
    url: "https://i.yfi.moe/i/2024/08/04/un8qt-rb.webp",
  },
  {
    Key: "i/2024/09/01/1886ul-92.png",
    LastModified: "2024-09-02T03:38:40.401Z",
    url: "https://i.yfi.moe/i/2024/09/01/1886ul-92.png",
  },
  {
    Key: "i/2024/09/01/188v0o-nl.png",
    LastModified: "2024-09-02T03:38:38.274Z",
    url: "https://i.yfi.moe/i/2024/09/01/188v0o-nl.png",
  },
  {
    Key: "i/2024/10/15/CleanShot 2024-10-15 at 15.39.55.png",
    LastModified: "2024-10-15T22:40:24.260Z",
    url: "https://i.yfi.moe/i/2024/10/15/CleanShot 2024-10-15 at 15.39.55.png",
  },
  {
    Key: "i/2024/10/15/CleanShot_2024-10-15_15.44.37.png",
    LastModified: "2024-10-15T22:44:59.442Z",
    url: "https://i.yfi.moe/i/2024/10/15/CleanShot_2024-10-15_15.44.37.png",
  },
  {
    Key: "i/2024/10/15/CleanShot_2024-10-15_15.47.48.png",
    LastModified: "2024-10-15T22:48:00.751Z",
    url: "https://i.yfi.moe/i/2024/10/15/CleanShot_2024-10-15_15.47.48.png",
  },
  {
    Key: "i/2024/10/15/CleanShot_2024-10-15_15.50.40.png",
    LastModified: "2024-10-15T22:51:05.864Z",
    url: "https://i.yfi.moe/i/2024/10/15/CleanShot_2024-10-15_15.50.40.png",
  },
  {
    Key: "i/2024/10/15/CleanShot_2024-10-15_15.53.12.png",
    LastModified: "2024-10-15T22:54:03.908Z",
    url: "https://i.yfi.moe/i/2024/10/15/CleanShot_2024-10-15_15.53.12.png",
  },
];

describe("filter", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2050, 0));
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it("should filter by prefix", () => {
    const result = filterImages(
      MOCK_DATA,
      { ...DEFAULT_FILTER_OPTIONS, prefix: "i/2024/01/14" },
      { enableFuzzySearch: false, fuzzySearchThreshold: 0.6 },
    );
    expect(result).toMatchSnapshot();
  });

  it("should filter by date range", () => {
    const result = filterImages(
      MOCK_DATA,
      {
        ...DEFAULT_FILTER_OPTIONS,
        dateRange: {
          start: new Date("2024-05-10T02:30:18.303Z"),
          end: new Date("2024-06-07T02:30:21.003Z"),
        },
      },
      { enableFuzzySearch: false, fuzzySearchThreshold: 0.6 },
    );
    expect(result).toMatchSnapshot();
  });
  it("should honor sort by option", () => {
    (["key", "date"] as const).forEach((by) => {
      const result = filterImages(
        MOCK_DATA.slice(0, 5),
        {
          ...DEFAULT_FILTER_OPTIONS,
          sort: {
            by,
            orderIsDesc: true,
          },
        },
        { enableFuzzySearch: false, fuzzySearchThreshold: 0.6 },
      );
      expect(result).toMatchSnapshot();
    });
  });
  it("should honor sort order option", () => {
    const results = [true, false].map((orderIsDesc) =>
      filterImages(
        MOCK_DATA.slice(0, 5),
        {
          ...DEFAULT_FILTER_OPTIONS,
          sort: {
            by: "key",
            orderIsDesc,
          },
        },
        { enableFuzzySearch: false, fuzzySearchThreshold: 0.6 },
      ),
    );
    expect(results[0]?.length).not.toBe(0);
    expect(results[0]).toEqual(results[1]?.reverse());
  });
  it("should use simple search if fuzzy search is disabled", () => {
    const result = filterImages(
      MOCK_DATA,
      {
        ...DEFAULT_FILTER_OPTIONS,
        searchTerm: "2.webp",
      },
      { enableFuzzySearch: false, fuzzySearchThreshold: 0.6 },
    );
    expect(result).toMatchSnapshot();
  });
  it("should use fuzzy search if enabled", () => {
    const result = filterImages(
      MOCK_DATA,
      {
        ...DEFAULT_FILTER_OPTIONS,
        searchTerm: "880o",
      },
      { enableFuzzySearch: true, fuzzySearchThreshold: 0.6 },
    );
    expect(result).toMatchSnapshot();
  });
  it("should honor fuzzy search threshold", () => {
    const result = filterImages(
      MOCK_DATA,
      {
        ...DEFAULT_FILTER_OPTIONS,
        searchTerm: "880o",
      },
      { enableFuzzySearch: true, fuzzySearchThreshold: 1 },
    );
    expect(result.length).toBe(MOCK_DATA.length);
  });
});

describe("persist filter", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2050, 0));
  });
  afterEach(() => {
    vi.useRealTimers();
  });
  it("should load", () => {
    const result = loadOptions(new URLSearchParams("prefix=i/2023"), {
      prefix: "i/2023",
    });
    expect(result).toEqual({
      ...DEFAULT_FILTER_OPTIONS,
      prefix: "i/2023",
    });
  });
  it("should save", () => {
    const result = saveOptions({ ...DEFAULT_FILTER_OPTIONS, prefix: "i/2023" });
    expect(result).toEqual({ prefix: "i/2023" });
  });
  it("should ignore invalid dateRange", () => {
    const result = loadOptions(new URLSearchParams("dateRange=invalid"), {
      dateRange: "invalid",
    });
    expect(result).toBeUndefined();
  });
  it("should load custom dateRange", () => {
    const result = loadOptions(
      new URLSearchParams(
        "dateRangeType=custom&dateRangeStart=2024-10-02T20:50:38.301Z&dateRangeEnd=2024-10-16T20:50:38.301Z",
      ),
      {
        dateRangeType: "custom",
        dateRangeStart: "2024-10-02T20:50:38.301Z",
        dateRangeEnd: "2024-10-16T20:50:38.301Z",
      },
    );
    expect(result).toEqual({
      ...DEFAULT_FILTER_OPTIONS,
      dateRange: {
        start: new Date("2024-10-02T20:50:38.301Z"),
        end: new Date("2024-10-16T20:50:38.301Z"),
      },
      dateRangeType: "custom",
    });
  });
});
