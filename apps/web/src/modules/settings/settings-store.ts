import { atomWithStorageMigration } from "@/lib/atoms/atomWithStorageMigration";
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
  gallerySettingsSchema,
  optionsSchema,
  profilesSchema,
  profilesSchemaForLoad,
  getDefaultOptions,
  getDefaultProfiles,
} = v3Schema;

export {
  profilesSchema,
  s3SettingsSchema,
  uploadSettingsSchema,
  gallerySettingsSchema,
  optionsSchema,
  getDefaultOptions,
};

export type S3Options = z.infer<typeof s3SettingsSchema>;

export type UploadOptions = z.infer<typeof uploadSettingsSchema>;
export type KeyTemplatePreset = NonNullable<
  z.infer<typeof uploadSettingsSchema.shape.keyTemplatePresets>
>[number];

export type GalleryOptions = z.infer<typeof gallerySettingsSchema>;

export type Options = z.infer<typeof optionsSchema>;

export const profilesAtom = atomWithStorageMigration(
  "s3ip:profiles-list",
  {
    initialFn: migrateV2ToV3,
    schema: profilesSchemaForLoad,
    version: 3,
    migrate: (stored, oldVersionNumber) => {
      console.error(
        `Should not have any migration for now, but got ${oldVersionNumber}, stored: ${JSON.stringify(stored)}`,
      );
      return getDefaultProfiles();
    },
  },
  {},
);

profilesAtom.onMount = () => {
  return () => {
    migrateV2ToV3OnUnmount();
  };
};

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
