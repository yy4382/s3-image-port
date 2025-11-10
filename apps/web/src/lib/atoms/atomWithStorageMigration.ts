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
export type WithVersion<T> = { version: number; data: T };

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
  const {
    version,
    migrate,
    corruptedStorageFixFn,
    corruptedDataFixFn,
    initialFn,
    schema: dataSchema,
  } = dataOptions;
  const { storage, ...rest } = options;
  const storageInitialToken =
    "INITIAL_VALUE_THAT_INDICATES_THAT_THE_STORAGE_IS_NOT_INITIALIZED";

  const baseAtom = atomWithStorage<unknown>(
    key,
    { version, data: storageInitialToken },
    storage,
    rest,
  );

  function getValue(valueWithV: unknown): z4.infer<K> {
    const parsedWithVersion = withVersionSchema.safeParse(valueWithV);

    // data is very corrupted, not having version or data, return initial value
    if (!parsedWithVersion.success) {
      return corruptedStorageFixFn
        ? corruptedStorageFixFn(valueWithV)
        : initialFn();
    }

    // data is not presented in storage, return initial value
    if (parsedWithVersion.data.data === storageInitialToken) {
      return initialFn();
    }

    // data is the same version as the current version, return the data
    if (parsedWithVersion.data.version === version) {
      const parsedData = z.safeParse(dataSchema, parsedWithVersion.data.data);
      if (parsedData.success) {
        return parsedData.data;
      } else {
        return corruptedDataFixFn
          ? corruptedDataFixFn(parsedWithVersion.data.data)
          : initialFn();
      }
    }

    // data is the different version as the current version, migrate the data
    return migrate(parsedWithVersion.data.data, parsedWithVersion.data.version);
  }

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
  return { valueAtom: anAtom, migrateRawData: getValue };
}
