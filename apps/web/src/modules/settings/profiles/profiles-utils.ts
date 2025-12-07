import { useAtom, useSetAtom } from "jotai";
import { resetGalleryStateAtom } from "../../gallery/hooks/use-photo-list";
import type { Options } from "../settings-store";
import { optionsSchema, profilesAtom } from "../settings-store";
import { migrateFromV1 } from "../schema/migrations/v1-v3";
import { toast } from "sonner";
import { useCallback } from "react";
import { useTranslations } from "use-intl";
import { z } from "zod";
import { produce } from "immer";

export function useRenameProfile() {
  const t = useTranslations("settings.profiles.errors");
  const [profileList, setProfileList] = useAtom(profilesAtom);
  const rename = useCallback(
    ({ oldName, newName }: { oldName: string; newName: string }) => {
      if (oldName === newName) {
        toast.error(t("sameNameError"));
        return;
      }
      if (profileList.list.find((p) => p[0] === newName)) {
        toast.error(t("nameExists"));
        return;
      }
      setProfileList((profiles) =>
        produce(profiles, (draft) => {
          const oldIndex = draft.list.findIndex((p) => p[0] === oldName);
          if (oldIndex === -1) {
            return;
          }
          draft.list[oldIndex][0] = newName;
        }),
      );
    },
    [profileList, setProfileList, t],
  );

  return rename;
}

export function useLoadProfile() {
  const t = useTranslations("settings.profiles.errors");
  const [profileList, setProfileList] = useAtom(profilesAtom);
  const resetGalleryState = useSetAtom(resetGalleryStateAtom);

  const load = (name: string) => {
    const targetProfileIndex = profileList.list.findIndex((p) => p[0] === name);

    if (targetProfileIndex === -1) {
      toast.error(t("loadFailed"));
      return;
    }

    if (targetProfileIndex !== profileList.current) {
      setProfileList((profiles) =>
        produce(profiles, (draft) => {
          draft.current = targetProfileIndex;
        }),
      );
      resetGalleryState();

      toast.success(t("loadSuccess", { name }));
    }
  };

  return load;
}

export const useDuplicateProfile = () => {
  const t = useTranslations("settings.profiles.errors");
  const [profileList, setProfileList] = useAtom(profilesAtom);

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
      while (profileList.list.find((p) => p[0] === newName)) {
        counter++;
        newName = `${name} (copy ${counter})`;
      }

      // Get the profile to duplicate
      const profileToDuplicate = profileList.list.find(
        (p) => p[0] === name,
      )?.[1];

      if (profileToDuplicate) {
        setProfileList((profiles) =>
          produce(profiles, (draft) => {
            draft.list.push([newName, profileToDuplicate]);
          }),
        );
        toast.success(t("duplicateSuccess", { name, newName }));
      } else {
        toast.error(t("duplicateFailed"));
      }
    },
    [profileList, setProfileList, t],
  );
  return duplicate;
};

export const useDeleteProfile = () => {
  const t = useTranslations("settings.profiles.errors");
  const [profileList, setProfileList] = useAtom(profilesAtom);
  const deleteProfile = (nameToDelete: string) => {
    const profileToDeleteIndex = profileList.list.findIndex(
      (p) => p[0] === nameToDelete,
    );

    if (profileToDeleteIndex === -1) {
      toast.error(t("profileNotFound"));
      return;
    }

    if (profileToDeleteIndex === profileList.current) {
      toast.error(t("cannotDeleteCurrent"));
      return;
    }

    setProfileList((profiles) =>
      produce(profiles, (draft) => {
        draft.list.splice(profileToDeleteIndex, 1);
        if (draft.current > profileToDeleteIndex) {
          draft.current--;
        }
      }),
    );
    toast.success(t("deleteSuccess", { nameToDelete }));
  };
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
  const [profileList, setProfileList] = useAtom(profilesAtom);
  const importProfile = useCallback(
    (newProfile: { name: string; data: Options }) => {
      try {
        const data = newProfile.data;
        const name = newProfile.name;

        if (profileList.list.find((p) => p[0] === name)) {
          toast.error(t("nameExistsImport", { name }));
          return;
        }

        setProfileList((profiles) =>
          produce(profiles, (draft) => {
            draft.list.push([name, data]);
          }),
        );
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
