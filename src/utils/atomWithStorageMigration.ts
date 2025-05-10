import deepEqual from "deep-equal";
import { atom, type SetStateAction } from "jotai";
import { atomWithStorage } from "jotai/utils";
import z from "zod";

const withVersionSchema = z.object({
  version: z.number(),
  data: z.unknown(),
});

export type WithVersion<T> = { version: number; data: T };

export function atomWithStorageMigration<T>(
  key: string,
  initialValue: T,
  storage: Parameters<typeof atomWithStorage>[2],
  options: Parameters<typeof atomWithStorage>[3] & {
    version: number;
    migrate: (stored: unknown, oldVersion: number, initialValue: T) => T;
  },
) {
  const { version, migrate, ...rest } = options;
  const baseAtom = atomWithStorage<unknown>(
    key,
    { version, data: initialValue },
    storage,
    rest,
  );

  function getValue(valueWithV: unknown): T {
    const parsedWithVersion = withVersionSchema.safeParse(valueWithV);
    if (parsedWithVersion.success) {
      if (parsedWithVersion.data.version === version) {
        return parsedWithVersion.data.data as T;
      }
      return migrate(
        parsedWithVersion.data.data as T,
        parsedWithVersion.data.version,
        initialValue,
      );
    }
    return initialValue;
  }

  const anAtom = atom(
    (get) => {
      const storedWithVersion = get(baseAtom) as object;
      return getValue(storedWithVersion);
    },
    (get, set, update: SetStateAction<T>) => {
      const nextValue =
        typeof update === "function"
          ? (update as (prev: T) => T)(getValue(get(baseAtom)))
          : update;
      set(baseAtom, { version, data: nextValue });
    },
  );
  const withVersionAtom = atom(
    (get) => {
      return { version, data: get(anAtom) };
    },
    (_, set, update: WithVersion<unknown>) => {
      const migrated = getValue(update);
      set(baseAtom, { version, data: migrated });
    },
  );
  const deepEqualWith = atom(null, (get, _, other: WithVersion<unknown>) => {
    const stored = get(anAtom);
    const parsedOther = withVersionSchema.safeParse(other);
    if (!parsedOther.success) {
      return false;
    }
    const migratedOther = getValue(parsedOther.data);
    return deepEqual(stored, migratedOther);
  });
  return [anAtom, withVersionAtom, deepEqualWith] as const;
}
