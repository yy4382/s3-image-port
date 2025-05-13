import { atomWithStorage } from "jotai/utils";
import { atom, useAtom, useSetAtom } from "jotai";
import { Button } from "@/components/ui/button";
import { resetGalleryStateAtom } from "../gallery/galleryStore";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import McPencil from "~icons/mingcute/pencil-2-line";
import McCopy from "~icons/mingcute/copy-2-line";
import { ClientOnly } from "@tanstack/react-router";
import type { Options as Profile } from "./settingsStore";
import { optionsAtom } from "./settingsStore";
import { toast } from "sonner";
import { useEffect } from "react";

const CURRENT_PROFILE = "CURRENT";

// The current profile is not stored in here!
const profileListAtom = atomWithStorage<
  [string, Profile | typeof CURRENT_PROFILE][]
>("s3ip:profile:profiles", [["Default", CURRENT_PROFILE]]);

// need to check if the profile name already exists
const renameProfileAtom = atom(
  null,
  (get, set, { oldName, newName }: { oldName: string; newName: string }) => {
    if (oldName === newName) {
      toast.error("New name is the same as the old name");
      return;
    }
    // check if the new name already exists
    if (get(profileListAtom).find((p) => p[0] === newName)) {
      toast.error("Profile name already exists");
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

const loadProfileAtom = atom(null, (get, set, name: string) => {
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
    toast.error("Failed to load profile. Please try again.");
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

    toast.success(`Profile "${name}" loaded successfully.`);
  }
});

const duplicateProfileAtom = atom(
  null,
  (
    get,
    set,
    {
      name,
      newName: initialNewNameSuggestion,
    }: { name: string; newName: string },
  ) => {
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
      toast.success(`Profile "${name}" duplicated as "${newName}".`);
    } else {
      toast.error("Failed to duplicate profile.");
    }
  },
);

const deleteProfileAtom = atom(null, (get, set, nameToDelete: string) => {
  const currentProfiles = get(profileListAtom);
  const profileToDelete = currentProfiles.find((p) => p[0] === nameToDelete);

  if (!profileToDelete) {
    toast.error("Profile not found for deletion.");
    return;
  }

  if (profileToDelete[1] === CURRENT_PROFILE) {
    toast.error("Cannot delete the currently active profile.");
    return;
  }

  const newProfiles = currentProfiles.filter((p) => p[0] !== nameToDelete);
  set(profileListAtom, newProfiles);
  toast.success(`Profile "${nameToDelete}" deleted.`);
});

function Profiles() {
  const [profiles, setProfiles] = useAtom(profileListAtom);
  const loadProfile = useSetAtom(loadProfileAtom);
  const renameProfile = useSetAtom(renameProfileAtom);
  const duplicateProfile = useSetAtom(duplicateProfileAtom);
  const deleteProfile = useSetAtom(deleteProfileAtom);

  useEffect(() => {
    if (profiles.length === 0) {
      setProfiles([["Default", CURRENT_PROFILE]]);
    }
  }, [profiles.length, setProfiles]);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Profiles</h2>
      </div>

      <ClientOnly>
        <div className="grid gap-4 md:grid-cols-2">
          {profiles.map(([name, profile]) => (
            <div
              key={name}
              className={`border border-border rounded-lg p-4 ${
                profile === CURRENT_PROFILE ? "ring-2 ring-primary" : ""
              }`}
            >
              <div className="flex justify-between items-center mb-3">
                <h3 className="font-medium text-lg">
                  {name}
                  {profile === CURRENT_PROFILE && (
                    <span className="ml-2 bg-primary text-primary-foreground text-xs font-semibold px-2.5 py-1 rounded">
                      Current
                    </span>
                  )}
                </h3>
              </div>

              <div className="flex flex-wrap gap-2 mt-4">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" className="flex-1">
                      <McPencil className="h-5 w-5 mr-1" />
                      Rename
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
                          renameProfile({ oldName: name, newName });
                        }
                      }}
                    >
                      <Input
                        defaultValue={name}
                        name="input"
                        className="w-40"
                      />
                      <Button type="submit" size="sm">
                        Update
                      </Button>
                    </form>
                  </DropdownMenuContent>
                </DropdownMenu>

                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => {
                    duplicateProfile({ name, newName: `${name} (copy)` });
                  }}
                >
                  <McCopy className="h-5 w-5 mr-1" />
                  Duplicate
                </Button>

                {profile !== CURRENT_PROFILE && (
                  <>
                    <Button
                      onClick={() => loadProfile(name)}
                      className="flex-1"
                    >
                      Load
                    </Button>
                    <Button
                      variant="destructive"
                      className="flex-1"
                      onClick={() => {
                        deleteProfile(name);
                      }}
                    >
                      Delete
                    </Button>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      </ClientOnly>
    </div>
  );
}

export { Profiles };
