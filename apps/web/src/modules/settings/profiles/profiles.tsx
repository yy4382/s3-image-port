"use client";

import { useAtomValue, useSetAtom } from "jotai";
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
import { settings } from "@/stores/atoms/settings";
import { replaceSettingsProfileAtom } from "../replace-profile";
import { SyncSettings } from "../sync/components/sync-settings";
import { useCopy } from "@/lib/hooks/use-copy";

type ProfileItemProps = {
  name: string;
  isCurrent: boolean;
};

function ProfileItem({ name, isCurrent }: ProfileItemProps) {
  const t = useTranslations("settings.profiles");
  const errors = useTranslations("settings.profiles.errors");
  const { copy } = useCopy();
  const runProfile = useSetAtom(settings.profiles);
  const replaceProfile = useSetAtom(replaceSettingsProfileAtom);
  const handleExport = () => {
    const outcome = runProfile({ type: "export", name });
    if (outcome.status === "exported") {
      copy(outcome.value, `Profile "${name}"`);
    } else {
      toast.error(errors("profileNotFound"));
    }
  };

  const rename = (newName: string) => {
    const outcome = runProfile({ type: "rename", oldName: name, newName });
    if (outcome.status === "same-name") toast.error(errors("sameNameError"));
    if (outcome.status === "name-exists") toast.error(errors("nameExists"));
    if (outcome.status === "not-found") toast.error(errors("profileNotFound"));
  };

  const duplicate = () => {
    const outcome = runProfile({
      type: "duplicate",
      name,
      newName: `${name} (copy)`,
    });
    if (outcome.status === "duplicated") {
      toast.success(
        errors("duplicateSuccess", { name, newName: outcome.newName }),
      );
    } else {
      toast.error(errors("duplicateFailed"));
    }
  };

  const load = () => {
    const outcome = replaceProfile({ type: "activate", name });
    if (outcome.status === "applied") {
      toast.success(errors("loadSuccess", { name }));
    } else if (outcome.status === "not-found") {
      toast.error(errors("loadFailed"));
    }
  };

  const deleteProfile = () => {
    const outcome = runProfile({ type: "delete", name });
    if (outcome.status === "deleted") {
      toast.success(errors("deleteSuccess", { nameToDelete: name }));
    } else if (outcome.status === "active-profile") {
      toast.error(errors("cannotDeleteCurrent"));
    } else {
      toast.error(errors("profileNotFound"));
    }
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
                  rename(newName);
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
          onClick={duplicate}
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
            <Button onClick={load} className="flex-1 min-w-[calc(50%-0.25rem)]">
              {t("load")}
            </Button>
            <DeleteProfileConfirm deleteFn={deleteProfile} />
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
  const errors = useTranslations("settings.profiles.errors");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const runProfile = useSetAtom(settings.profiles);

  const importProfile = (value: unknown) => {
    const outcome = runProfile({ type: "import", value });
    if (outcome.status === "imported") {
      toast.success(errors("importSuccess", { name: outcome.name }));
    } else if (outcome.status === "name-exists") {
      toast.error(errors("nameExistsImport", { name: outcome.name }));
    } else {
      toast.error(errors("invalidFormat"));
      console.error("Failed to parse profile", outcome.error);
    }
  };

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

  const handleV1ClipboardImport = async () => {
    try {
      const value = await navigator.clipboard.readText();
      if (!value) return;
      const name = `Migrated ${new Date().toISOString()}`;
      const outcome = runProfile({ type: "import-v1", value, name });
      if (outcome.status === "imported") {
        toast.success(errors("importSuccess", { name }));
      } else if (outcome.status === "name-exists") {
        toast.error(errors("nameExistsImport", { name }));
      } else {
        toast.error(errors("invalidFormat"));
        console.error("Failed to parse profile", outcome.error);
      }
    } catch (error) {
      toast.error(t("failedToReadClipboard"));
      console.error("Clipboard read error:", error);
    }
  };

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
  const profiles = useAtomValue(settings.profiles).profiles;
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
          {profiles.list.map(([name], index) => (
            <ProfileItem
              key={name}
              name={name}
              isCurrent={index === profiles.current}
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
