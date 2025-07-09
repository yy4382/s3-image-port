import { atomWithStorage } from "jotai/utils";
import { useAtom, useAtomValue, useSetAtom } from "jotai";
import { resetGalleryStateAtom } from "../gallery/galleryStore";
import type { Options, Options as Profile } from "./settings-store";
import { migrateFromV1, optionsAtom, optionsSchema } from "./settings-store";
import { toast } from "sonner";
import { useCallback } from "react";
import { useTranslations } from "next-intl";
import z from "zod/v4";

export const CURRENT_PROFILE = "CURRENT";

// The current profile is not stored in here!
export const profileListAtom = atomWithStorage<
  [string, Profile | typeof CURRENT_PROFILE][]
>("s3ip:profile:profiles", [["Default", CURRENT_PROFILE]]);

export function useRenameProfile() {
  const t = useTranslations("settings.profiles.errors");
  const [profileList, setProfileList] = useAtom(profileListAtom);
  const rename = useCallback(
    ({ oldName, newName }: { oldName: string; newName: string }) => {
      if (oldName === newName) {
        toast.error(t("sameNameError"));
        return;
      }
      if (profileList.find((p) => p[0] === newName)) {
        toast.error(t("nameExists"));
        return;
      }
      const newProfiles = profileList.map((p) => {
        if (p[0] === oldName) {
          return [newName, p[1]] as [string, Profile | typeof CURRENT_PROFILE];
        }
        return p;
      });
      setProfileList(newProfiles);
    },
    [profileList, setProfileList, t],
  );

  return rename;
}

export function useLoadProfile() {
  const t = useTranslations("settings.profiles.errors");
  const [profileList, setProfileList] = useAtom(profileListAtom);
  const [options, setOptions] = useAtom(optionsAtom);
  const resetGalleryState = useSetAtom(resetGalleryStateAtom);

  const load = useCallback(
    (name: string) => {
      let profileToBeLoad: Profile | typeof CURRENT_PROFILE | undefined;
      let currentProfileName: string | undefined;
      let currentProfileIndex = -1;
      let targetProfileIndex = -1;

      // Single pass to find all required information
      for (let i = 0; i < profileList.length; i++) {
        const [profileName, profile] = profileList[i];
        if (profileName === name) {
          profileToBeLoad = profile;
          targetProfileIndex = i;
        }
        if (profile === CURRENT_PROFILE) {
          currentProfileName = profileName;
          currentProfileIndex = i;
        }
      }

      if (
        !profileToBeLoad ||
        !currentProfileName ||
        currentProfileIndex === -1
      ) {
        toast.error(t("loadFailed"));
        return;
      }

      if (profileToBeLoad !== CURRENT_PROFILE) {
        const currentProfile = options;

        // Create new profiles array with updated values
        const newProfiles = [...profileList];
        newProfiles[currentProfileIndex] = [currentProfileName, currentProfile];
        newProfiles[targetProfileIndex] = [name, CURRENT_PROFILE];

        setOptions(profileToBeLoad);
        setProfileList(newProfiles);
        resetGalleryState();

        toast.success(t("loadSuccess", { name }));
      }
    },
    [options, profileList, resetGalleryState, setOptions, setProfileList, t],
  );
  return load;
}

export const useDuplicateProfile = () => {
  const t = useTranslations("settings.profiles.errors");
  const [profileList, setProfileList] = useAtom(profileListAtom);
  const options = useAtomValue(optionsAtom);
  const duplicate = useCallback(
    ({
      name,
      newName: initialNewNameSuggestion,
    }: {
      name: string;
      newName: string;
    }) => {
      // Find a unique name
      let newName = initialNewNameSuggestion;
      let counter = 1;
      while (profileList.find((p) => p[0] === newName)) {
        counter++;
        newName = `${name} (copy ${counter})`;
      }

      // Get the profile to duplicate
      const profileToDuplicate =
        profileList.find((p) => p[0] === name)?.[1] === CURRENT_PROFILE
          ? options
          : profileList.find((p) => p[0] === name)?.[1];

      if (profileToDuplicate) {
        setProfileList([...profileList, [newName, profileToDuplicate]]);
        toast.success(t("duplicateSuccess", { name, newName }));
      } else {
        toast.error(t("duplicateFailed"));
      }
    },
    [profileList, setProfileList, options, t],
  );
  return duplicate;
};

export const useDeleteProfile = () => {
  const t = useTranslations("settings.profiles.errors");
  const [profileList, setProfileList] = useAtom(profileListAtom);
  const deleteProfile = useCallback(
    (nameToDelete: string) => {
      const profileToDelete = profileList.find((p) => p[0] === nameToDelete);

      if (!profileToDelete) {
        toast.error(t("profileNotFound"));
        return;
      }

      if (profileToDelete[1] === CURRENT_PROFILE) {
        toast.error(t("cannotDeleteCurrent"));
        return;
      }

      const newProfiles = profileList.filter((p) => p[0] !== nameToDelete);
      setProfileList(newProfiles);
      toast.success(t("deleteSuccess", { nameToDelete }));
    },
    [profileList, setProfileList, t],
  );
  return deleteProfile;
};

export function parseProfile(
  profileJson: string,
): { name: string; data: Options } | Error {
  let jsonParsed: Record<string, unknown>;
  try {
    jsonParsed = JSON.parse(profileJson);
  } catch (error) {
    return new Error("Failed to parse profile", { cause: error });
  }

  const parsed = z
    .object({
      name: z.string(),
      data: optionsSchema,
    })
    .safeParse(jsonParsed);

  if (!parsed.success) {
    return new Error("Failed to parse profile", { cause: parsed.error });
  }

  return parsed.data;
}

export function useImportProfile() {
  const t = useTranslations("settings.profiles.errors");
  const [profileList, setProfileList] = useAtom(profileListAtom);
  const importProfile = useCallback(
    (newProfile: { name: string; data: Options }) => {
      try {
        const data = newProfile.data;
        const name = newProfile.name;

        if (profileList.find((p) => p[0] === name)) {
          toast.error(t("nameExistsImport", { name }));
          return;
        }

        setProfileList([...profileList, [name, data]]);
        toast.success(t("importSuccess", { name }));
      } catch (error) {
        if (error instanceof z.ZodError) {
          toast.error(t("validationFailed", { error: z.prettifyError(error) }));
        } else {
          toast.error(t("parseFailed"));
        }
        console.error("Import profile error:", error);
      }
    },
    [profileList, setProfileList, t],
  );
  return importProfile;
}

function useGetClipboardText() {
  const t = useTranslations("settings.profiles");
  const getClipboardText = useCallback(async () => {
    try {
      return await navigator.clipboard.readText();
    } catch (error) {
      toast.error(t("failedToReadClipboard"));
      console.error("Clipboard read error:", error);
      return undefined;
    }
  }, [t]);
  return getClipboardText;
}

export function useHandleV1ClipboardImport() {
  const t = useTranslations("settings.profiles");
  const getClipboardText = useGetClipboardText();
  const importProfile = useImportProfile();
  const handle = useCallback(async (): Promise<
    { success: false } | { success: true; name: string }
  > => {
    const text = await getClipboardText();
    if (!text) {
      return { success: false };
    }
    console.log("text", text);
    const result = migrateFromV1(text);
    if (result instanceof Error) {
      toast.error(t("errors.invalidFormat"));
      console.error("Failed to parse profile", result);
      return { success: false };
    }
    const name = `Migrated ${new Date().toISOString()}`;
    importProfile({
      name,
      data: result,
    });
    return { success: true, name };
  }, [getClipboardText, importProfile, t]);
  return handle;
}
