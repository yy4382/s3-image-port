import * as z from "zod";
import { s3SettingsAtom, s3SettingsSchema, setS3SettingsAtom } from "./s3";
import { atomWithStorage } from "jotai/utils";
import { atom, useAtom, useAtomValue, useSetAtom } from "jotai";
import { Button } from "@/components/ui/button";
import { resetGalleryStateAtom } from "../gallery/gallery";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import deepEqual from "deep-equal";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import McAlertDiamond from "~icons/mingcute/alert-diamond-line";
import McCheckCircle from "~icons/mingcute/check-circle-line";
import McPencil from "~icons/mingcute/pencil-2-line";
import McCopy from "~icons/mingcute/copy-2-line";
import {
  setUploadSettingsAtom,
  uploadSettingsAtom,
  uploadSettingsSchema,
} from "./upload";
import { ClientOnly } from "@tanstack/react-router";

const _profileSchema = z.object({
  // TODO maybe add a version field to the profile
  s3: s3SettingsSchema,
  upload: uploadSettingsSchema,
});

type Profile = z.infer<typeof _profileSchema>;

const profileAtom = atom<Profile>((get) => {
  const s3Settings = get(s3SettingsAtom);
  const uploadSettings = get(uploadSettingsAtom);
  return {
    s3: s3Settings,
    upload: uploadSettings,
  } as Profile;
});
const setProfileAtom = atom(null, (get, set, profile: Profile) => {
  const s3Settings = get(s3SettingsAtom);
  const newS3Settings = { ...s3Settings, ...profile.s3 };
  set(setS3SettingsAtom, newS3Settings);
  const uploadSettings = get(uploadSettingsAtom);
  const newUploadSettings = { ...uploadSettings, ...profile.upload };
  set(setUploadSettingsAtom, newUploadSettings);
});

const currentProfileNameAtom = atomWithStorage<string>(
  "s3ip:profile:currentName",
  "Default",
);

const profilesAtom = atomWithStorage<Record<string, Profile>>(
  "s3ip:profile:profiles",
  {},
);

// need to check if the profile name already exists
const renameProfileAtom = atom(
  null,
  (get, set, { oldName, newName }: { oldName: string; newName: string }) => {
    if (oldName === newName) {
      return;
    }
    if (get(profilesAtom)[newName]) {
      return;
    }
    set(currentProfileNameAtom, newName);
    const newProfiles: Record<string, Profile> = {
      ...get(profilesAtom),
      [newName]: get(profilesAtom)[oldName],
    };
    delete newProfiles[oldName];
    set(profilesAtom, newProfiles);
  },
);

const loadProfileAtom = atom(null, (get, set, name: string) => {
  const profiles = get(profilesAtom);
  const profile = profiles[name];
  if (profile) {
    set(currentProfileNameAtom, name);
    set(setProfileAtom, profile);

    // also, reset gallery state
    set(resetGalleryStateAtom);
  }
});

const duplicateProfileAtom = atom(
  null,
  (get, set, { name, newName }: { name: string; newName: string }) => {
    const profiles = get(profilesAtom);
    const profile = profiles[name];
    if (profile) {
      set(profilesAtom, {
        ...profiles,
        [newName]: profile,
      });
    }
  },
);
const hasChangeAtom = atom((get) => {
  return !deepEqual(
    get(profilesAtom)[get(currentProfileNameAtom)],
    get(profileAtom),
  );
});

function Profiles() {
  const profile = useAtomValue(profileAtom);
  const currentProfileName = useAtomValue(currentProfileNameAtom);
  const [profiles, setProfiles] = useAtom(profilesAtom);
  const loadProfile = useSetAtom(loadProfileAtom);
  const renameProfile = useSetAtom(renameProfileAtom);
  const duplicateProfile = useSetAtom(duplicateProfileAtom);
  const hasChanges = useAtomValue(hasChangeAtom);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Profiles</h2>
        <ClientOnly>
          {hasChanges && (
            <Button
              onClick={() => {
                setProfiles({
                  ...profiles,
                  [currentProfileName]: profile,
                });
              }}
              className="bg-green-600 hover:bg-green-700"
            >
              Save Changes
            </Button>
          )}
        </ClientOnly>
      </div>

      <ClientOnly>
        {hasChanges ? (
          <Alert variant="destructive">
            <McAlertDiamond className="h-5 w-5 text-amber-400" />
            <AlertTitle>Some setting changes not saved to profiles</AlertTitle>
            <AlertDescription>
              <p>
                You have unsaved changes to the{" "}
                <strong>{currentProfileName}</strong> profile
              </p>
            </AlertDescription>
          </Alert>
        ) : (
          <Alert>
            <McCheckCircle className="h-5 w-5" />
            <AlertDescription>
              Your profile is up to date with the current settings
            </AlertDescription>
          </Alert>
        )}

        <div className="grid gap-4 md:grid-cols-2">
          {Object.keys(profiles).map((name) => (
            <div
              key={name}
              className={`border border-border rounded-lg p-4 ${name === currentProfileName ? "ring-2 ring-primary" : ""}`}
            >
              <div className="flex justify-between items-center mb-3">
                <h3 className="font-medium text-lg">
                  {name}
                  {name === currentProfileName && (
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

                {name !== currentProfileName && (
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
                        const newProfiles = { ...profiles };
                        delete newProfiles[name];
                        setProfiles(newProfiles);
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
