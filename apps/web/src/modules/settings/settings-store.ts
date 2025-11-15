import {
  atomWithStorageMigration,
  zodWithVersion,
} from "@/lib/atoms/atomWithStorageMigration";
import { focusAtom } from "jotai-optics";
import { z } from "zod";
import { atom, SetStateAction } from "jotai";
import * as v3Schema from "./schema/v3";
import { enableMapSet, produce } from "immer";
import {
  migrateV2ToV3,
  migrateV2ToV3OnUnmount,
} from "./schema/migrations/v2-v3";

enableMapSet();

const {
  s3SettingsSchema,
  uploadSettingsSchema,
  optionsSchema,
  profilesSchemaForLoad,
  getDefaultOptions,
  getDefaultProfiles,
} = v3Schema;

export {
  s3SettingsSchema,
  uploadSettingsSchema,
  optionsSchema,
  getDefaultOptions,
  getDefaultProfiles,
};

export type S3Options = z.infer<typeof s3SettingsSchema>;

export type KeyTemplatePreset = NonNullable<
  z.infer<typeof uploadSettingsSchema.shape.keyTemplatePresets>
>[number];

export type Options = z.infer<typeof optionsSchema>;

const SETTINGS_STORE_KEY = "s3ip:profiles-list";
const SETTINGS_STORE_VERSION = 3;

const {
  valueAtom: settingsStoreAtom,
  migrateRawData: migrateSettingsStoreRawData,
} = atomWithStorageMigration(
  SETTINGS_STORE_KEY,
  {
    initialFn: migrateV2ToV3,
    schema: profilesSchemaForLoad,
    version: SETTINGS_STORE_VERSION,
    migrate: (stored, oldVersionNumber) => {
      console.error(
        `Should not have any migration for now, but got ${oldVersionNumber}, stored: ${JSON.stringify(stored)}`,
      );
      return getDefaultProfiles();
    },
  },
  {},
);
settingsStoreAtom.onMount = () => {
  return () => {
    migrateV2ToV3OnUnmount();
  };
};

export const settingsForSyncSchema = zodWithVersion(
  profilesSchemaForLoad.omit({ current: true }),
);
export const settingsIntoSyncFormat = (
  settings: z.infer<typeof profilesSchemaForLoad>,
) => {
  const { current: _, ...rest } = settings;
  return {
    version: SETTINGS_STORE_VERSION,
    data: rest,
  };
};
export function settingsForSyncFromUnknown(rawData: unknown) {
  return settingsIntoSyncFormat(migrateSettingsStoreRawData(rawData));
}
export const settingsForSyncAtom = atom(
  (get) => {
    const settings = get(settingsStoreAtom);
    return settingsIntoSyncFormat(settings);
  },
  (_get, set, data: SetStateAction<z.infer<typeof settingsForSyncSchema>>) => {
    set(settingsStoreAtom, (prev) => {
      const currentIndex = prev.current;
      const currentName = prev.list[currentIndex][0];
      function getNewData() {
        if (typeof data === "function") {
          const result = data(settingsIntoSyncFormat(prev));
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

export const profilesAtom = atom(
  (get) => {
    return get(settingsStoreAtom);
  },
  (_, set, update: SetStateAction<z.infer<typeof profilesSchemaForLoad>>) => {
    set(settingsStoreAtom, update);
  },
);

export const optionsAtom = atom(
  (get) => {
    const profiles = get(profilesAtom);
    const profile = profiles.list.at(profiles.current) ?? profiles.list[0];
    return profile[1];
  },
  (get, set, update: SetStateAction<Options>) => {
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

export const s3SettingsAtom = focusAtom(optionsAtom, (optic) =>
  optic.prop("s3"),
);

export const uploadSettingsAtom = focusAtom(optionsAtom, (optic) =>
  optic.prop("upload"),
);

export const gallerySettingsAtom = focusAtom(optionsAtom, (optic) =>
  optic.prop("gallery"),
);

export const validS3SettingsAtom = atom((get) => {
  const settings = get(s3SettingsAtom);
  const result = s3SettingsSchema.safeParse(settings);
  if (result.success) {
    return result.data;
  }
  return undefined;
});
