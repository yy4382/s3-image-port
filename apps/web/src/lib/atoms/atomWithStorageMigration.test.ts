/* eslint-disable @typescript-eslint/no-unused-vars */
import { beforeEach, describe, expect, it, vi } from "vitest";
import { renderHook } from "vitest-browser-react";
import { Provider, useAtom } from "jotai";
import { z } from "zod";
import {
  atomWithStorageMigration,
  zodWithVersion,
} from "./atomWithStorageMigration";

beforeEach(() => {
  localStorage.clear();
});

const TestProvider = Provider;

describe("zodWithVersion", () => {
  it("should create a schema with version and data fields", () => {
    const innerSchema = z.object({ name: z.string() });
    const schema = zodWithVersion(innerSchema);

    const validData = { version: 1, data: { name: "test" } };
    const result = schema.safeParse(validData);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.version).toBe(1);
      expect(result.data.data).toEqual({ name: "test" });
    }
  });

  it("should reject data without version", () => {
    const innerSchema = z.object({ name: z.string() });
    const schema = zodWithVersion(innerSchema);

    const invalidData = { data: { name: "test" } };
    const result = schema.safeParse(invalidData);

    expect(result.success).toBe(false);
  });

  it("should reject data without data field", () => {
    const innerSchema = z.object({ name: z.string() });
    const schema = zodWithVersion(innerSchema);

    const invalidData = { version: 1 };
    const result = schema.safeParse(invalidData);

    expect(result.success).toBe(false);
  });
});

describe("atomWithStorageMigration", () => {
  const testSchema = z.object({
    name: z.string(),
    count: z.number(),
  });

  const getDefaultValue = () => ({ name: "default", count: 0 });
  const STORAGE_KEY = "test:storage";

  const createTestAtom = (options?: {
    version?: number;
    migrate?: (
      stored: unknown,
      oldVersion: number,
    ) => z.infer<typeof testSchema>;
    corruptedStorageFixFn?: (stored: unknown) => z.infer<typeof testSchema>;
    corruptedDataFixFn?: (corruptedData: unknown) => z.infer<typeof testSchema>;
  }) => {
    return atomWithStorageMigration(
      STORAGE_KEY,
      {
        schema: testSchema,
        initialFn: getDefaultValue,
        version: options?.version ?? 1,
        migrate: options?.migrate ?? (() => getDefaultValue()),
        corruptedStorageFixFn: options?.corruptedStorageFixFn,
        corruptedDataFixFn: options?.corruptedDataFixFn,
      },
      {},
    );
  };

  describe("initial value", () => {
    it("should return initial value when storage is empty", async () => {
      const { valueAtom } = createTestAtom();

      const { result } = await renderHook(() => useAtom(valueAtom), {
        wrapper: TestProvider,
      });

      expect(result.current[0]).toEqual(getDefaultValue());
    });

    it("should return initial value when storage has the initial token", async () => {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({
          version: 1,
          data: "INITIAL_VALUE_THAT_INDICATES_THAT_THE_STORAGE_IS_NOT_INITIALIZED",
        }),
      );

      const { valueAtom } = createTestAtom();

      const { result } = await renderHook(() => useAtom(valueAtom), {
        wrapper: TestProvider,
      });

      expect(result.current[0]).toEqual(getDefaultValue());
    });
  });

  describe("reading valid data", () => {
    it("should read valid data with correct version", async () => {
      const storedData = { name: "stored", count: 42 };
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ version: 1, data: storedData }),
      );

      const { valueAtom } = createTestAtom();

      const { result } = await renderHook(() => useAtom(valueAtom), {
        wrapper: TestProvider,
      });

      expect(result.current[0]).toEqual(storedData);
    });
  });

  describe("writing data", () => {
    it("should write data correctly", async () => {
      const { valueAtom } = createTestAtom();

      const { result, act } = await renderHook(() => useAtom(valueAtom), {
        wrapper: TestProvider,
      });

      const newData = { name: "updated", count: 100 };
      await act(() => {
        result.current[1](newData);
      });

      expect(result.current[0]).toEqual(newData);

      const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
      expect(stored).toEqual({ version: 1, data: newData });
    });

    it("should support function updates", async () => {
      const storedData = { name: "stored", count: 10 };
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ version: 1, data: storedData }),
      );

      const { valueAtom } = createTestAtom();

      const { result, act } = await renderHook(() => useAtom(valueAtom), {
        wrapper: TestProvider,
      });

      await act(() => {
        result.current[1]((prev) => ({ ...prev, count: prev.count + 5 }));
      });

      expect(result.current[0]).toEqual({ name: "stored", count: 15 });
    });
  });

  describe("version migration", () => {
    it("should migrate data from old version", async () => {
      const oldData = { name: "old", count: 5 };
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ version: 1, data: oldData }),
      );

      const migrate = vi.fn((stored: unknown, oldVersion: number) => {
        const data = stored as { name: string; count: number };
        return { name: `migrated-${data.name}`, count: data.count * 2 };
      });

      const { valueAtom } = createTestAtom({ version: 2, migrate });

      const { result } = await renderHook(() => useAtom(valueAtom), {
        wrapper: TestProvider,
      });

      expect(migrate).toHaveBeenCalledWith(oldData, 1);
      expect(result.current[0]).toEqual({ name: "migrated-old", count: 10 });
    });

    it("should not migrate when version matches", async () => {
      const storedData = { name: "current", count: 7 };
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ version: 2, data: storedData }),
      );

      const migrate = vi.fn(() => getDefaultValue());

      const { valueAtom } = createTestAtom({ version: 2, migrate });

      const { result } = await renderHook(() => useAtom(valueAtom), {
        wrapper: TestProvider,
      });

      expect(migrate).not.toHaveBeenCalled();
      expect(result.current[0]).toEqual(storedData);
    });
  });

  describe("corrupted storage handling", () => {
    it("should return initial value for completely corrupted storage", async () => {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ random: "garbage" }));

      const { valueAtom } = createTestAtom();

      const { result } = await renderHook(() => useAtom(valueAtom), {
        wrapper: TestProvider,
      });

      expect(result.current[0]).toEqual(getDefaultValue());
    });

    it("should call corruptedStorageFixFn when provided for corrupted storage", async () => {
      const corruptedValue = { random: "garbage" };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(corruptedValue));

      const corruptedStorageFixFn = vi.fn(() => ({
        name: "fixed-storage",
        count: 999,
      }));

      const { valueAtom } = createTestAtom({ corruptedStorageFixFn });

      const { result } = await renderHook(() => useAtom(valueAtom), {
        wrapper: TestProvider,
      });

      expect(corruptedStorageFixFn).toHaveBeenCalledWith(corruptedValue);
      expect(result.current[0]).toEqual({ name: "fixed-storage", count: 999 });
    });

    it("should handle non-JSON storage value", async () => {
      localStorage.setItem(STORAGE_KEY, "not-json-at-all");

      const { valueAtom } = createTestAtom();

      const { result } = await renderHook(() => useAtom(valueAtom), {
        wrapper: TestProvider,
      });

      expect(result.current[0]).toEqual(getDefaultValue());
    });
  });

  describe("corrupted data handling", () => {
    it("should return initial value for data that does not match schema", async () => {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({
          version: 1,
          data: { name: "valid", count: "not-a-number" },
        }),
      );

      const { valueAtom } = createTestAtom();

      const { result } = await renderHook(() => useAtom(valueAtom), {
        wrapper: TestProvider,
      });

      expect(result.current[0]).toEqual(getDefaultValue());
    });

    it("should call corruptedDataFixFn when provided for invalid data", async () => {
      const corruptedData = { name: "valid", count: "not-a-number" };
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ version: 1, data: corruptedData }),
      );

      const corruptedDataFixFn = vi.fn(() => ({
        name: "fixed-data",
        count: 888,
      }));

      const { valueAtom } = createTestAtom({ corruptedDataFixFn });

      const { result } = await renderHook(() => useAtom(valueAtom), {
        wrapper: TestProvider,
      });

      expect(corruptedDataFixFn).toHaveBeenCalledWith(corruptedData);
      expect(result.current[0]).toEqual({ name: "fixed-data", count: 888 });
    });

    it("should handle missing required fields in data", async () => {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ version: 1, data: { name: "only-name" } }),
      );

      const { valueAtom } = createTestAtom();

      const { result } = await renderHook(() => useAtom(valueAtom), {
        wrapper: TestProvider,
      });

      expect(result.current[0]).toEqual(getDefaultValue());
    });
  });

  describe("migrateRawData", () => {
    it("should transform valid versioned data correctly", () => {
      const { migrateRawData } = createTestAtom();

      const result = migrateRawData({
        version: 1,
        data: { name: "raw", count: 33 },
      });

      expect(result).toEqual({ name: "raw", count: 33 });
    });

    it("should return initial value for corrupted storage format", () => {
      const { migrateRawData } = createTestAtom();

      const result = migrateRawData({ invalid: "structure" });

      expect(result).toEqual(getDefaultValue());
    });

    it("should apply migration for old versions", () => {
      const migrate = vi.fn((stored: unknown, oldVersion: number) => ({
        name: "migrated",
        count: 777,
      }));

      const { migrateRawData } = createTestAtom({ version: 3, migrate });

      const result = migrateRawData({ version: 1, data: { old: "data" } });

      expect(migrate).toHaveBeenCalledWith({ old: "data" }, 1);
      expect(result).toEqual({ name: "migrated", count: 777 });
    });

    it("should return initial value for storage initial token", () => {
      const { migrateRawData } = createTestAtom();

      const result = migrateRawData({
        version: 1,
        data: "INITIAL_VALUE_THAT_INDICATES_THAT_THE_STORAGE_IS_NOT_INITIALIZED",
      });

      expect(result).toEqual(getDefaultValue());
    });

    it("should apply corruptedStorageFixFn for invalid structure", () => {
      const corruptedStorageFixFn = vi.fn(() => ({
        name: "storage-fixed",
        count: 111,
      }));

      const { migrateRawData } = createTestAtom({ corruptedStorageFixFn });

      const result = migrateRawData("totally-broken");

      expect(corruptedStorageFixFn).toHaveBeenCalledWith("totally-broken");
      expect(result).toEqual({ name: "storage-fixed", count: 111 });
    });

    it("should apply corruptedDataFixFn for invalid data", () => {
      const corruptedDataFixFn = vi.fn(() => ({
        name: "data-fixed",
        count: 222,
      }));

      const { migrateRawData } = createTestAtom({ corruptedDataFixFn });

      const result = migrateRawData({ version: 1, data: { wrongShape: true } });

      expect(corruptedDataFixFn).toHaveBeenCalledWith({ wrongShape: true });
      expect(result).toEqual({ name: "data-fixed", count: 222 });
    });
  });

  describe("edge cases", () => {
    it("should handle null in localStorage", async () => {
      localStorage.setItem(STORAGE_KEY, "null");

      const { valueAtom } = createTestAtom();

      const { result } = await renderHook(() => useAtom(valueAtom), {
        wrapper: TestProvider,
      });

      expect(result.current[0]).toEqual(getDefaultValue());
    });

    it("should handle empty object in localStorage", async () => {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({}));

      const { valueAtom } = createTestAtom();

      const { result } = await renderHook(() => useAtom(valueAtom), {
        wrapper: TestProvider,
      });

      expect(result.current[0]).toEqual(getDefaultValue());
    });

    it("should handle array in localStorage", async () => {
      localStorage.setItem(STORAGE_KEY, JSON.stringify([1, 2, 3]));

      const { valueAtom } = createTestAtom();

      const { result } = await renderHook(() => useAtom(valueAtom), {
        wrapper: TestProvider,
      });

      expect(result.current[0]).toEqual(getDefaultValue());
    });
  });
});
