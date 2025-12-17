import { atomWithStorageMigration } from "@/lib/atoms/atomWithStorageMigration";
import { z } from "zod";
import { atom, SetStateAction } from "jotai";
import { enableMapSet, produce } from "immer";
import {
  migrateV2ToV3,
  migrateV2ToV3OnUnmount,
} from "../schemas/settings/migrations/v2-v3";
import {
  SETTINGS_STORE_VERSION,
  storedSettingsSchema,
  getDefaultStoredSettings,
  settingsForSyncSchema,
  optionsSchema,
  profilesSchemaForLoad,
} from "../schemas/settings";
import { focusAtom } from "jotai-optics";

enableMapSet();

const SETTINGS_STORE_KEY = "s3ip:profiles-list";

// MARK: Storage atom
const {
  valueAtom: settingsStoreAtom,
  migrateRawData: migrateSettingsStoreRawData,
} = atomWithStorageMigration(
  SETTINGS_STORE_KEY,
  {
    initialFn: migrateV2ToV3,
    schema: storedSettingsSchema,
    version: SETTINGS_STORE_VERSION,
    migrate: (stored, oldVersionNumber) => {
      console.error(
        `Should not have any migration for now, but got ${oldVersionNumber}, stored: ${JSON.stringify(stored)}`,
      );
      return getDefaultStoredSettings();
    },
  },
  {},
);
settingsStoreAtom.onMount = () => {
  return () => {
    migrateV2ToV3OnUnmount();
  };
};

// MARK: Derived atoms

export const storedSettingsIntoSyncFormat = (
  settings: z.infer<typeof storedSettingsSchema>,
) => {
  const { current: _, ...rest } = settings;
  return {
    version: SETTINGS_STORE_VERSION,
    data: rest,
  };
};
/**
 * Input: Expect to be "storedSettings" with version number wrapped. Also accept "corrupted" or "outdated" data.
 *
 * Output: the {@link settingsForSyncSchema} value, after applying migrations and possible fixes.
 */
export function settingsForSyncFromUnknown(rawData: unknown) {
  return storedSettingsIntoSyncFormat(migrateSettingsStoreRawData(rawData));
}

const settingsForSyncAtom = atom(
  (get) => {
    const settings = get(settingsStoreAtom);
    return storedSettingsIntoSyncFormat(settings);
  },
  (_get, set, data: SetStateAction<z.infer<typeof settingsForSyncSchema>>) => {
    set(settingsStoreAtom, (prev) => {
      const currentIndex = prev.current;
      const currentName = prev.list[currentIndex][0];
      function getNewData() {
        if (typeof data === "function") {
          const result = data(storedSettingsIntoSyncFormat(prev));
          return result.data;
        }
        return data.data;
      }
      const newData = getNewData();
      const newIndex = newData.list.findIndex(([name]) => name === currentName);
      if (newIndex !== -1) {
        return {
          ...newData,
          current: newIndex,
        };
      }
      if (currentIndex < newData.list.length) {
        return {
          ...newData,
          current: currentIndex,
        };
      }
      return {
        ...newData,
        current: 0,
      };
    });
  },
);

const profilesAtom = atom(
  (get) => {
    return get(settingsStoreAtom);
  },
  (_, set, update: SetStateAction<z.infer<typeof profilesSchemaForLoad>>) => {
    set(settingsStoreAtom, update);
  },
);

const optionsAtom = atom(
  (get) => {
    const profiles = get(profilesAtom);
    const profile = profiles.list.at(profiles.current) ?? profiles.list[0];
    return profile[1];
  },
  (get, set, update: SetStateAction<z.infer<typeof optionsSchema>>) => {
    const profiles = get(profilesAtom);
    const newProfiles = produce(profiles, (draft) => {
      const oldOptions = draft.list[draft.current][1];
      const newOptions =
        typeof update === "function" ? update(oldOptions) : update;
      draft.list[draft.current][1] = newOptions;
    });
    set(profilesAtom, newProfiles);
  },
);

const s3SettingsAtom = focusAtom(optionsAtom, (optic) => optic.prop("s3"));
const gallerySettingsAtom = focusAtom(optionsAtom, (optic) =>
  optic.prop("gallery"),
);
const uploadSettingsAtom = focusAtom(optionsAtom, (optic) =>
  optic.prop("upload"),
);

const validS3SettingsAtom = atom((get) => {
  const settings = get(s3SettingsAtom);
  const result = optionsSchema.shape.s3.safeParse(settings);
  if (result.success) {
    return result.data;
  }
  return undefined;
});

export {
  profilesAtom,
  settingsForSyncAtom,
  optionsAtom,
  s3SettingsAtom,
  gallerySettingsAtom,
  uploadSettingsAtom,
  validS3SettingsAtom,
};
