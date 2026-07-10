import { describe, expect, it } from "vitest";

import { ControllableStorage } from "./storage";

describe("controllable browser storage", () => {
  it("separates reads, persistence writes, removals, and failures", () => {
    const storage = new ControllableStorage({
      "s3ip:profiles-list": "stored-profile",
    });

    expect(storage.getItem("s3ip:profiles-list")).toBe("stored-profile");
    storage.setItem("s3ip:gallery:photos", "[]");
    storage.removeItem("s3ip:profiles-list");

    expect(storage.getCalls).toEqual(["s3ip:profiles-list"]);
    expect(storage.setCalls).toEqual([
      { key: "s3ip:gallery:photos", value: "[]" },
    ]);
    expect(storage.removeCalls).toEqual(["s3ip:profiles-list"]);
    expect(storage.length).toBe(1);
    expect(storage.key(0)).toBe("s3ip:gallery:photos");

    storage.failReads();
    expect(() => storage.getItem("s3ip:gallery:photos")).toThrow(
      "Storage read failed",
    );
    storage.clearFailures();

    storage.failWrites();
    expect(() => storage.setItem("sizes", "{}")).toThrow(
      "Storage write failed",
    );
    expect(storage.getItem("sizes")).toBeNull();
    storage.clearFailures();

    storage.failRemovals();
    expect(() => storage.removeItem("s3ip:gallery:photos")).toThrow(
      "Storage remove failed",
    );
    expect(storage.getItem("s3ip:gallery:photos")).toBe("[]");
  });
});
