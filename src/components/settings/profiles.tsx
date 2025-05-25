"use client";

import { atomWithStorage } from "jotai/utils";
import { atom, useAtom, useSetAtom } from "jotai";
import { Button } from "@/components/ui/button";
import { resetGalleryStateAtom } from "../gallery/galleryStore";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import {
  PencilIcon,
  CopyIcon,
  DownloadIcon,
  UploadIcon,
  ClipboardIcon,
  FileUpIcon,
} from "lucide-react";
import type { Options as Profile } from "./settingsStore";
import { optionsAtom, optionsSchema } from "./settingsStore";
import { toast } from "sonner";
import { useEffect, useRef } from "react";
import { ClientOnly } from "../misc/client-only";
import { useTranslations } from "next-intl";
import z from "zod/v4";
import { getTranslations } from "next-intl/server";

const CURRENT_PROFILE = "CURRENT";

// The current profile is not stored in here!
const profileListAtom = atomWithStorage<
  [string, Profile | typeof CURRENT_PROFILE][]
>("s3ip:profile:profiles", [["Default", CURRENT_PROFILE]]);

// need to check if the profile name already exists
const renameProfileAtom = atom(
  null,
  async (
    get,
    set,
    { oldName, newName }: { oldName: string; newName: string },
  ) => {
    const t = await getTranslations("settings.profiles.errors");

    if (oldName === newName) {
      toast.error(t("sameNameError"));
      return;
    }
    // check if the new name already exists
    if (get(profileListAtom).find((p) => p[0] === newName)) {
      toast.error(t("nameExists"));
      return;
    }
    const newProfiles = get(profileListAtom).map((p) => {
      if (p[0] === oldName) {
        return [newName, p[1]] as [string, Profile | typeof CURRENT_PROFILE];
      }
      return p;
    });
    set(profileListAtom, newProfiles);
  },
);

const loadProfileAtom = atom(null, async (get, set, name: string) => {
  const t = await getTranslations("settings.profiles.errors");

  const profiles = get(profileListAtom);
  let profileToBeLoad: Profile | typeof CURRENT_PROFILE | undefined;
  let currentProfileName: string | undefined;
  let currentProfileIndex = -1;
  let targetProfileIndex = -1;

  // Single pass to find all required information
  for (let i = 0; i < profiles.length; i++) {
    const [profileName, profile] = profiles[i];
    if (profileName === name) {
      profileToBeLoad = profile;
      targetProfileIndex = i;
    }
    if (profile === CURRENT_PROFILE) {
      currentProfileName = profileName;
      currentProfileIndex = i;
    }
  }

  if (!profileToBeLoad || !currentProfileName || currentProfileIndex === -1) {
    toast.error(t("loadFailed"));
    return;
  }

  if (profileToBeLoad !== CURRENT_PROFILE) {
    const currentProfile = get(optionsAtom);

    // Create new profiles array with updated values
    const newProfiles = [...profiles];
    newProfiles[currentProfileIndex] = [currentProfileName, currentProfile];
    newProfiles[targetProfileIndex] = [name, CURRENT_PROFILE];

    set(optionsAtom, profileToBeLoad);
    set(profileListAtom, newProfiles);
    set(resetGalleryStateAtom);

    toast.success(t("loadSuccess", { name }));
  }
});

const duplicateProfileAtom = atom(
  null,
  async (
    get,
    set,
    {
      name,
      newName: initialNewNameSuggestion,
    }: { name: string; newName: string },
  ) => {
    const t = await getTranslations("settings.profiles.errors");

    const profiles = get(profileListAtom);

    // Find a unique name
    let newName = initialNewNameSuggestion;
    let counter = 1;
    while (profiles.find((p) => p[0] === newName)) {
      counter++;
      newName = `${name} (copy ${counter})`;
    }

    // Get the profile to duplicate
    const profileToDuplicate =
      profiles.find((p) => p[0] === name)?.[1] === CURRENT_PROFILE
        ? get(optionsAtom)
        : profiles.find((p) => p[0] === name)?.[1];

    if (profileToDuplicate) {
      set(profileListAtom, [...profiles, [newName, profileToDuplicate]]);
      toast.success(t("duplicateSuccess", { name, newName }));
    } else {
      toast.error(t("duplicateFailed"));
    }
  },
);

const deleteProfileAtom = atom(null, async (get, set, nameToDelete: string) => {
  const t = await getTranslations("settings.profiles.errors");

  const currentProfiles = get(profileListAtom);
  const profileToDelete = currentProfiles.find((p) => p[0] === nameToDelete);

  if (!profileToDelete) {
    toast.error(t("profileNotFound"));
    return;
  }

  if (profileToDelete[1] === CURRENT_PROFILE) {
    toast.error(t("cannotDeleteCurrent"));
    return;
  }

  const newProfiles = currentProfiles.filter((p) => p[0] !== nameToDelete);
  set(profileListAtom, newProfiles);
  toast.success(t("deleteSuccess", { nameToDelete }));
});

const importProfileAtom = atom(null, async (get, set, profileJson: string) => {
  const t = await getTranslations("settings.profiles.errors");

  try {
    const parsedProfile = JSON.parse(profileJson) as {
      name: string;
      data: Profile;
    };
    if (!parsedProfile.name || !parsedProfile.data) {
      toast.error(t("invalidFormat"));
      return;
    }

    const data = optionsSchema.parse(parsedProfile.data);
    const name = parsedProfile.name;

    const profiles = get(profileListAtom);
    if (profiles.find((p) => p[0] === name)) {
      toast.error(t("nameExistsImport", { name }));
      return;
    }

    set(profileListAtom, [...profiles, [name, data]]);
    toast.success(t("importSuccess", { name }));
  } catch (error) {
    if (error instanceof z.ZodError) {
      toast.error(t("validationFailed", { error: z.prettifyError(error) }));
    } else {
      toast.error(t("parseFailed"));
    }
    console.error("Import profile error:", error);
  }
});

type ProfileItemProps = {
  name: string;
  profile: Profile | typeof CURRENT_PROFILE;
  isCurrent: boolean;
  onRename: (oldName: string, newName: string) => void;
  onDuplicate: (name: string, newName: string) => void;
  onLoad: (name: string) => void;
  onDelete: (name: string) => void;
};

function ProfileItem({
  name,
  profile,
  isCurrent,
  onRename,
  onDuplicate,
  onLoad,
  onDelete,
}: ProfileItemProps) {
  const t = useTranslations("settings.profiles");
  const currentOptions = useAtom(optionsAtom)[0];

  const handleExport = () => {
    const profileData = profile === CURRENT_PROFILE ? currentOptions : profile;
    const profileJson = JSON.stringify({ name, data: profileData }, null, 2);
    navigator.clipboard
      .writeText(profileJson)
      .then(() => {
        toast.success(`Profile "${name}" exported to clipboard.`);
      })
      .catch(() => {
        toast.error("Failed to export profile to clipboard.");
      });
  };

  return (
    <div
      className={`border border-border rounded-lg p-4 ${
        isCurrent ? "ring-2 ring-primary" : ""
      }`}
    >
      <div className="flex justify-between items-center mb-3">
        <h3 className="font-medium text-lg">
          {name}
          {isCurrent && (
            <span className="ml-2 bg-primary text-primary-foreground text-xs font-semibold px-2.5 py-1 rounded">
              {t("current")}
            </span>
          )}
        </h3>
      </div>

      <div className="flex flex-wrap gap-2 mt-4">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="outline"
              className="flex-1 min-w-[calc(50%-0.25rem)]"
            >
              <PencilIcon className="h-5 w-5 mr-1" />
              {t("rename")}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            <form
              className="flex gap-2 p-2"
              onSubmit={(e) => {
                e.preventDefault();
                const formData = new FormData(e.currentTarget);
                const newName = formData.get("input") as string;
                if (newName) {
                  onRename(name, newName);
                }
              }}
            >
              <Input defaultValue={name} name="input" className="w-40" />
              <Button type="submit" size="sm">
                {t("update")}
              </Button>
            </form>
          </DropdownMenuContent>
        </DropdownMenu>

        <Button
          variant="outline"
          className="flex-1 min-w-[calc(50%-0.25rem)]"
          onClick={() => {
            onDuplicate(name, `${name} (copy)`);
          }}
        >
          <CopyIcon className="h-5 w-5 mr-1" />
          {t("duplicate")}
        </Button>

        <Button
          variant="outline"
          className="flex-1 min-w-[calc(50%-0.25rem)]"
          onClick={handleExport}
        >
          <UploadIcon className="h-5 w-5 mr-1" />
          {t("export")}
        </Button>

        {!isCurrent && (
          <>
            <Button
              onClick={() => onLoad(name)}
              className="flex-1 min-w-[calc(50%-0.25rem)]"
            >
              {t("load")}
            </Button>
            <Button
              variant="destructive"
              className="flex-1 min-w-[calc(50%-0.25rem)]"
              onClick={() => {
                onDelete(name);
              }}
            >
              {t("delete")}
            </Button>
          </>
        )}
      </div>
    </div>
  );
}

function Profiles() {
  const [profiles, setProfiles] = useAtom(profileListAtom);
  const loadProfile = useSetAtom(loadProfileAtom);
  const renameProfile = useSetAtom(renameProfileAtom);
  const duplicateProfile = useSetAtom(duplicateProfileAtom);
  const deleteProfile = useSetAtom(deleteProfileAtom);
  const importProfile = useSetAtom(importProfileAtom);
  const t = useTranslations("settings.profiles");
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (profiles.length === 0) {
      setProfiles([["Default", CURRENT_PROFILE]]);
    }
  }, [profiles.length, setProfiles]);

  const handleClipboardImport = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (!text.trim()) {
        toast.error(t("clipboardEmpty"));
        return;
      }
      importProfile(text.trim());
    } catch (error) {
      toast.error(t("failedToReadClipboard"));
      console.error("Clipboard read error:", error);
    }
  };

  const handleFileImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const content = event.target?.result as string;
        if (content) {
          importProfile(content);
        }
      } catch (error) {
        toast.error(t("failedToReadFile"));
        console.error("File read error:", error);
      }
      // Reset file input so the same file can be selected again
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    };
    reader.onerror = () => {
      toast.error(t("failedToReadFile"));
    };
    reader.readAsText(file);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">{t("title")}</h2>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button>
              <DownloadIcon className="h-5 w-5 mr-1" />
              <span className="select-none">{t("importProfile")}</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>{t("importOptions")}</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleClipboardImport}>
              <ClipboardIcon className="h-5 w-5 mr-2" />
              {t("importFromClipboard")}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => fileInputRef.current?.click()}>
              <FileUpIcon className="h-5 w-5 mr-2" />
              {t("importFromFile")}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
        <input
          type="file"
          ref={fileInputRef}
          style={{ display: "none" }}
          accept=".json"
          onChange={handleFileImport}
        />
      </div>

      <ClientOnly>
        <div className="grid gap-4 md:grid-cols-2 mt-6">
          {profiles.map(([name, profile]) => (
            <ProfileItem
              key={name}
              name={name}
              profile={profile}
              isCurrent={profile === CURRENT_PROFILE}
              onRename={(oldName, newName) =>
                renameProfile({ oldName, newName })
              }
              onDuplicate={(profileName, newName) =>
                duplicateProfile({ name: profileName, newName })
              }
              onLoad={loadProfile}
              onDelete={deleteProfile}
            />
          ))}
        </div>
      </ClientOnly>
    </div>
  );
}

export { Profiles };
