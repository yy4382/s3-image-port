"use client";

import { useAtomValue } from "jotai";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
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
import { toast } from "sonner";
import { useRef, useState } from "react";
import { ClientOnly } from "@tanstack/react-router";
import { useTranslations } from "use-intl";
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
  parseProfile,
  useDeleteProfile,
  useDuplicateProfile,
  useHandleV1ClipboardImport,
  useImportProfile,
  useLoadProfile,
  useRenameProfile,
} from "./profiles-utils";
import { profilesAtom } from "@/stores/atoms/settings";
import { SyncSettings } from "../sync/components/sync-settings";
import { useCopy } from "@/lib/hooks/use-copy";
import { z } from "zod";
import { optionsSchema } from "@/stores/schemas/settings";

type ProfileItemProps = {
  name: string;
  profile: z.infer<typeof optionsSchema>;
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
  const { copy } = useCopy();
  const handleExport = () => {
    const profileData = profile;
    const profileJson = JSON.stringify({ name, data: profileData }, null, 2);
    copy(profileJson, `Profile "${name}"`);
  };

  return (
    <div
      className={`border border-border rounded-lg p-4 ${
        isCurrent ? "ring-2 ring-primary" : ""
      }`}
      data-testid={`profile-item-${name.replaceAll(" ", "-")}`}
      data-is-current={isCurrent}
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
          <DropdownMenuTrigger
            render={
              <Button
                variant="outline"
                className="flex-1 min-w-[calc(50%-0.25rem)]"
              >
                <McPencil className="h-5 w-5 mr-1" />
                {t("rename")}
              </Button>
            }
          />
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
              <Input
                defaultValue={name}
                name="input"
                className="w-40"
                onKeyDown={(e) => e.stopPropagation()}
              />
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
      <DialogTrigger
        render={
          <Button
            variant="destructive"
            className="flex-1 min-w-[calc(50%-0.25rem)]"
          >
            {t("delete")}
          </Button>
        }
      />
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
        <DropdownMenuTrigger
          render={
            <Button>
              <McDownload className="h-5 w-5 mr-1" />
              <span className="select-none">{t("importProfile")}</span>
            </Button>
          }
        />
        <DropdownMenuContent align="end">
          <DropdownMenuGroup>
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
          </DropdownMenuGroup>
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
  const profiles = useAtomValue(profilesAtom);
  const loadProfile = useLoadProfile();
  const renameProfile = useRenameProfile();
  const duplicateProfile = useDuplicateProfile();
  const deleteProfile = useDeleteProfile();
  const t = useTranslations("settings.profiles");

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
          {profiles.list.map(([name, profile], index) => (
            <ProfileItem
              key={name}
              name={name}
              profile={profile}
              isCurrent={index === profiles.current}
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
      <ClientOnly fallback={<Skeleton className="w-full h-96" />}>
        <SyncSettings />
      </ClientOnly>
    </div>
  );
}

export { Profiles };
