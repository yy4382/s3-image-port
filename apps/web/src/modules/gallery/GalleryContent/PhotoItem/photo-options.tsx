import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuPortal,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import type { StoredImage } from "@/modules/image-storage";
import { format } from "date-fns";
import {
  CopyIcon,
  DownloadIcon,
  ExpandIcon,
  MoreHorizontalIcon,
  PencilIcon,
  Trash2Icon,
} from "lucide-react";
import { ComponentPropsWithRef, useEffect, useRef, useState } from "react";
import MingcuteInformationLine from "~icons/mingcute/information-line.jsx";
import McKey2Line from "~icons/mingcute/key-2-line.jsx";
import McTimeLine from "~icons/mingcute/time-line.jsx";
import { useTranslations } from "use-intl";
import { imageCatalog } from "@/modules/image-catalog";
import { useSetAtom } from "jotai";
import { toast } from "sonner";
import { useCopy } from "@/lib/hooks/use-copy";

export function PhotoOptions({
  photo,
  opened,
  setOpened,
  triggerRender,
  onOpen,
  onAfterDelete,
  onAfterRename,
  triggerTooltip,
  disabled = false,
}: {
  photo: StoredImage;
  opened: boolean;
  setOpened: (opened: boolean) => void;
  triggerRender?: ComponentPropsWithRef<typeof DropdownMenuTrigger>["render"];
  triggerTooltip?: string;
  onOpen?: () => void;
  onAfterDelete?: () => void;
  onAfterRename?: (newKey: string) => void;
  disabled?: boolean;
}) {
  const t = useTranslations("gallery.item.options");
  const tControl = useTranslations("gallery.control");
  const tRename = useTranslations("gallery.item.options.renameMessages");
  const tDownload = useTranslations("gallery.item.options.downloadMessages");
  const runCatalog = useSetAtom(imageCatalog.run);
  const { copy } = useCopy();
  const [showDeleteConfirmModal, setShowDeleteConfirmModal] = useState(false);
  const [showRenameModal, setShowRenameModal] = useState(false);
  const [newKey, setNewKey] = useState(photo.key);
  const [isRenaming, setIsRenaming] = useState(false);
  const mounted = useRef(false);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  const deleteFn = async () => {
    if (disabled) return;
    toast.message(tControl("requestingDelete"));
    const outcome = await runCatalog({
      type: "delete",
      keys: [photo.key],
    });
    if (!mounted.current) return;
    if (outcome.status === "superseded") return;
    if (outcome.status === "deleted") {
      toast.success(tControl("deleteSuccess"));
      onAfterDelete?.();
    } else if (outcome.status === "invalid-settings") {
      toast.error(tControl("s3SettingsNotFound"));
    } else {
      toast.error(tControl("deleteFailed"));
    }
  };

  const lastModified = photo.lastModified
    ? format(new Date(photo.lastModified), "yyyy-MM-dd HH:mm:ss")
    : "";

  const handleRename = async () => {
    if (disabled) return;
    if (!newKey.trim()) {
      toast.error(tRename("invalidKey"));
      return;
    }
    if (newKey === photo.key) {
      toast.error(tRename("sameKey"));
      return;
    }
    setIsRenaming(true);
    toast.message(tRename("requesting"));
    const outcome = await runCatalog({
      type: "rename",
      oldKey: photo.key,
      newKey,
    });
    if (!mounted.current) return;
    setIsRenaming(false);
    if (outcome.status === "superseded") return;

    if (outcome.status === "renamed") {
      toast.success(tRename("success"));
      setShowRenameModal(false);
      setOpened(false);
      onAfterRename?.(newKey);
    } else if (outcome.status === "invalid-settings") {
      toast.error(tControl("s3SettingsNotFound"));
    } else if (outcome.status === "already-exists") {
      toast.error(tRename("objectExists"));
    } else if (outcome.status === "partial-rename") {
      toast.warning(tRename("partialSuccess"));
    } else {
      toast.error(tRename("failed"));
    }
  };

  const copyMarkdown = async () => {
    if (disabled) return;
    const outcome = await runCatalog({
      type: "access",
      key: photo.key,
      purpose: "markdown",
    });
    if (
      mounted.current &&
      outcome.status === "accessed" &&
      outcome.purpose === "markdown"
    ) {
      copy(outcome.value, "Markdown link");
    }
  };

  const download = async () => {
    if (disabled) return;
    const outcome = await runCatalog({
      type: "access",
      key: photo.key,
      purpose: "download",
    });
    if (!mounted.current) return;
    if (outcome.status === "superseded") return;
    if (outcome.status !== "accessed" || outcome.purpose !== "download") {
      toast.error(
        outcome.status === "invalid-settings"
          ? tControl("s3SettingsNotFound")
          : tDownload("failed"),
      );
      return;
    }
    const url = URL.createObjectURL(outcome.value.body);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = photo.key;
    anchor.click();
    URL.revokeObjectURL(url);
    toast.success(tDownload("started"));
  };

  return (
    <>
      <DropdownMenu
        open={!disabled && opened}
        onOpenChange={(nextOpened) => {
          if (!disabled) setOpened(nextOpened);
        }}
        modal={false}
      >
        <Tooltip>
          <TooltipTrigger
            render={
              <DropdownMenuTrigger
                render={
                  triggerRender ?? (
                    <Button
                      aria-label={triggerTooltip ?? t("more")}
                      variant={"secondary"}
                      size="icon-sm"
                      disabled={disabled}
                    >
                      <MoreHorizontalIcon />
                    </Button>
                  )
                }
              />
            }
          />
          <TooltipContent>{triggerTooltip ?? t("more")}</TooltipContent>
        </Tooltip>
        <DropdownMenuContent>
          {onOpen && (
            <DropdownMenuItem onClick={onOpen} disabled={disabled}>
              <ExpandIcon /> {t("open")}
            </DropdownMenuItem>
          )}
          <DropdownMenuSub>
            <DropdownMenuSubTrigger>
              <MingcuteInformationLine /> {t("info")}
            </DropdownMenuSubTrigger>
            <DropdownMenuPortal>
              <DropdownMenuSubContent>
                <div className="flex flex-col space-y-1 shrink basis-0 grow min-w-0 p-2">
                  <div className="text-sm items-center inline-flex">
                    <McTimeLine className="shrink-0 mr-2" />
                    <span className="truncate block">{lastModified}</span>
                  </div>
                  <div className="text-sm items-center inline-flex">
                    <McKey2Line className="shrink-0 mr-2" />
                    <span title={photo.key} className="truncate block">
                      {photo.key}
                    </span>
                  </div>
                </div>
              </DropdownMenuSubContent>
            </DropdownMenuPortal>
          </DropdownMenuSub>
          <DropdownMenuItem onClick={copyMarkdown} disabled={disabled}>
            <CopyIcon /> {t("copyMarkdown")}
          </DropdownMenuItem>
          <DropdownMenuItem onClick={download} disabled={disabled}>
            <DownloadIcon /> {t("download")}
          </DropdownMenuItem>
          <DropdownMenuItem
            disabled={disabled}
            onClick={() => {
              setNewKey(photo.key);
              setShowRenameModal(true);
            }}
          >
            <PencilIcon /> {t("rename")}
          </DropdownMenuItem>
          <DropdownMenuItem
            disabled={disabled}
            onClick={() => setShowDeleteConfirmModal(true)}
          >
            <Trash2Icon /> {t("delete")}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Rename Dialog */}
      <Dialog
        open={!disabled && showRenameModal}
        onOpenChange={setShowRenameModal}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("renameModal.title")}</DialogTitle>
            <DialogDescription>
              {t("renameModal.description")}
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <label htmlFor="newKey" className="text-sm font-medium">
                {t("renameModal.currentLabel")}{" "}
                <span className="font-mono text-xs">{photo.key}</span>
              </label>
              <Input
                id="newKey"
                value={newKey}
                onChange={(e) => setNewKey(e.target.value)}
                placeholder={t("renameModal.placeholder")}
                disabled={isRenaming || disabled}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !isRenaming) {
                    handleRename();
                  }
                }}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowRenameModal(false)}
              disabled={isRenaming || disabled}
            >
              {t("renameModal.cancel")}
            </Button>
            <Button onClick={handleRename} disabled={isRenaming || disabled}>
              {isRenaming ? t("renameModal.renaming") : t("renameModal.rename")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <Dialog
        open={!disabled && showDeleteConfirmModal}
        onOpenChange={setShowDeleteConfirmModal}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("deleteModal.title")}</DialogTitle>
            <DialogDescription>
              {t("deleteModal.description")}
            </DialogDescription>
          </DialogHeader>
          <ul className="list-disc list-inside max-h-[300px] overflow-y-auto">
            <li>{photo.key}</li>
          </ul>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowDeleteConfirmModal(false)}
              disabled={disabled}
            >
              {t("deleteModal.cancel")}
            </Button>
            <Button
              disabled={disabled}
              onClick={() => {
                deleteFn();
                setShowDeleteConfirmModal(false);
              }}
            >
              {t("deleteModal.delete")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
