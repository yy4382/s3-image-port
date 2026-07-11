import { atom, type SetStateAction } from "jotai";
import { atomWithStorage } from "jotai/utils";
import { z } from "zod";
import * as z4 from "zod/v4/core";

export function zodWithVersion<T extends z4.$ZodType>(schema: T) {
  return z.object({
    version: z.number(),
    data: schema,
  });
}
const withVersionSchema = zodWithVersion(z.unknown());
const storageInitialToken =
  "INITIAL_VALUE_THAT_INDICATES_THAT_THE_STORAGE_IS_NOT_INITIALIZED";

export function createStorageMigration<K extends z4.$ZodObject>(dataOptions: {
  schema: K;
  initialFn: () => z4.infer<K>;
  version: number;
  migrate: (stored: unknown, oldVersion: number) => z4.infer<K>;
  corruptedStorageFixFn?: (stored: unknown) => z4.infer<K>;
  corruptedDataFixFn?: (corruptedData: unknown) => z4.infer<K>;
}) {
  const {
    version,
    migrate,
    corruptedStorageFixFn,
    corruptedDataFixFn,
    initialFn,
    schema: dataSchema,
  } = dataOptions;
  return function migrateRawData(valueWithV: unknown): z4.infer<K> {
    const parsedWithVersion = withVersionSchema.safeParse(valueWithV);

    if (!parsedWithVersion.success) {
      return corruptedStorageFixFn
        ? corruptedStorageFixFn(valueWithV)
        : initialFn();
    }
    if (parsedWithVersion.data.data === storageInitialToken) {
      return initialFn();
    }
    if (parsedWithVersion.data.version === version) {
      const parsedData = z.safeParse(dataSchema, parsedWithVersion.data.data);
      if (parsedData.success) return parsedData.data;
      return corruptedDataFixFn
        ? corruptedDataFixFn(parsedWithVersion.data.data)
        : initialFn();
    }
    return migrate(parsedWithVersion.data.data, parsedWithVersion.data.version);
  };
}

export function atomWithStorageMigration<K extends z4.$ZodObject>(
  key: string,
  dataOptions: {
    schema: K;
    initialFn: () => z4.infer<K>;
    version: number;
    migrate: (stored: unknown, oldVersion: number) => z4.infer<K>;
    corruptedStorageFixFn?: (stored: unknown) => z4.infer<K>;
    corruptedDataFixFn?: (corruptedData: unknown) => z4.infer<K>;
  },
  options: Parameters<typeof atomWithStorage>[3] & {
    storage?: Parameters<typeof atomWithStorage>[2];
  },
) {
  const { version } = dataOptions;
  const { storage, ...rest } = options;
  const getValue = createStorageMigration(dataOptions);

  const baseAtom = atomWithStorage<unknown>(
    key,
    { version, data: storageInitialToken },
    storage,
    rest,
  );

  const anAtom = atom(
    (get) => {
      const storedWithVersion = get(baseAtom) as object;
      return getValue(storedWithVersion);
    },
    (get, set, update: SetStateAction<z4.output<K>>) => {
      const nextValue =
        typeof update === "function" ? update(getValue(get(baseAtom))) : update;
      set(baseAtom, { version, data: nextValue });
    },
  );
  return {
    valueAtom: anAtom,
    /**
     * Transform a "maybe corrupted" value (typically from storage) into a "expected schema value", applying migrations and possible fixes.
     *
     * The input value is expected to be a "expected schema value" wrapped with version number, but also accept "corrupted" data.
     */
    migrateRawData: getValue,
  };
}
