"use client";

import { useAtom } from "jotai";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import McPencil from "~icons/mingcute/pencil-2-line.jsx";
import McCopy from "~icons/mingcute/copy-2-line.jsx";
import McDownload from "~icons/mingcute/download-2-line.jsx";
import McUpload from "~icons/mingcute/upload-2-line.jsx";
import McClipboard from "~icons/mingcute/clipboard-line.jsx";
import McFile from "~icons/mingcute/file-upload-line.jsx";
import type { Options as Profile } from "../settings-store";
import { optionsAtom } from "../settings-store";
import { toast } from "sonner";
import { useEffect, useRef, useState } from "react";
import { ClientOnly } from "@/components/misc/client-only";
import { useTranslations } from "next-intl";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  CURRENT_PROFILE,
  parseProfile,
  profileListAtom,
  useDeleteProfile,
  useDuplicateProfile,
  useHandleV1ClipboardImport,
  useImportProfile,
  useLoadProfile,
  useRenameProfile,
} from "./profiles-utils";

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
              <McPencil className="h-5 w-5 mr-1" />
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
          <McCopy className="h-5 w-5 mr-1" />
          {t("duplicate")}
        </Button>

        <Button
          variant="outline"
          className="flex-1 min-w-[calc(50%-0.25rem)]"
          onClick={handleExport}
        >
          <McUpload className="h-5 w-5 mr-1" />
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
            <DeleteProfileConfirm deleteFn={() => onDelete(name)} />
          </>
        )}
      </div>
    </div>
  );
}

function DeleteProfileConfirm({ deleteFn }: { deleteFn: () => void }) {
  const [open, setOpen] = useState(false);
  const t = useTranslations("settings.profiles");

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="destructive"
          className="flex-1 min-w-[calc(50%-0.25rem)]"
        >
          {t("delete")}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Delete Confirm</DialogTitle>
          <DialogDescription>
            Are you sure you want to delete this profile?
          </DialogDescription>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={deleteFn}>
              {t("delete")}
            </Button>
          </DialogFooter>
        </DialogHeader>
      </DialogContent>
    </Dialog>
  );
}

function ProfileImporter() {
  const t = useTranslations("settings.profiles");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const importProfile = useImportProfile();

  const handleClipboardImport = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (!text.trim()) {
        toast.error(t("clipboardEmpty"));
        return;
      }
      const parsed = parseProfile(text.trim());
      if (parsed instanceof Error) {
        toast.error(t("errors.invalidFormat"));
        console.error("Failed to parse profile", parsed);
        return;
      }
      importProfile(parsed);
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
          const parsed = parseProfile(content);
          if (parsed instanceof Error) {
            toast.error(t("errors.invalidFormat"));
            console.error("Failed to parse profile", parsed);
            return;
          }
          importProfile(parsed);
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

  const handleV1ClipboardImport = useHandleV1ClipboardImport();

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button>
            <McDownload className="h-5 w-5 mr-1" />
            <span className="select-none">{t("importProfile")}</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuLabel>{t("importOptions")}</DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={handleClipboardImport}>
            <McClipboard className="h-5 w-5 mr-2" />
            {t("importFromClipboard")}
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => fileInputRef.current?.click()}>
            <McFile className="h-5 w-5 mr-2" />
            {t("importFromFile")}
          </DropdownMenuItem>
          <DropdownMenuItem onClick={handleV1ClipboardImport}>
            <McClipboard className="h-5 w-5 mr-2" />
            {t("importFromV1Clipboard")}
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
    </>
  );
}

function Profiles() {
  const [profiles, setProfiles] = useAtom(profileListAtom);
  const loadProfile = useLoadProfile();
  const renameProfile = useRenameProfile();
  const duplicateProfile = useDuplicateProfile();
  const deleteProfile = useDeleteProfile();
  const t = useTranslations("settings.profiles");

  useEffect(() => {
    if (profiles.length === 0) {
      setProfiles([["Default", CURRENT_PROFILE]]);
    }
  }, [profiles.length, setProfiles]);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">{t("title")}</h2>
        <ProfileImporter />
      </div>

      <div className="grid gap-4 md:grid-cols-2 mt-6">
        <ClientOnly
          fallback={
            <>
              <Skeleton className="w-full h-40" />
              <Skeleton className="w-full h-40" />
            </>
          }
        >
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
        </ClientOnly>
      </div>
    </div>
  );
}

export { Profiles };
