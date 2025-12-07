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
import type { Photo } from "@/lib/utils/ImageS3Client";
import { format } from "date-fns";
import {
  CopyIcon,
  DownloadIcon,
  ExpandIcon,
  MoreHorizontalIcon,
  PencilIcon,
  Trash2Icon,
} from "lucide-react";
import { type ReactNode, useState } from "react";
import MingcuteInformationLine from "~icons/mingcute/information-line.jsx";
import McKey2Line from "~icons/mingcute/key-2-line.jsx";
import McTimeLine from "~icons/mingcute/time-line.jsx";
import { useTranslations } from "use-intl";
import { usePhotoOperations } from "../../hooks/photo";

export function PhotoOptions({
  photo,
  opened,
  setOpened,
  trigger,
  onOpen,
  onAfterDelete,
  onAfterRename,
}: {
  photo: Photo;
  opened: boolean;
  setOpened: (opened: boolean) => void;
  trigger?: ReactNode;
  onOpen?: () => void;
  onAfterDelete?: () => void;
  onAfterRename?: (newKey: string) => void;
}) {
  const t = useTranslations("gallery.item.options");
  const operations = usePhotoOperations(photo);

  const deleteFn = async () => {
    await operations.delete();
    onAfterDelete?.();
  };

  const [showDeleteConfirmModal, setShowDeleteConfirmModal] = useState(false);
  const [showRenameModal, setShowRenameModal] = useState(false);
  const [newKey, setNewKey] = useState(photo.Key);
  const [isRenaming, setIsRenaming] = useState(false);

  const handleRename = async () => {
    setIsRenaming(true);
    const result = await operations.rename(newKey);
    setIsRenaming(false);

    if (result.success) {
      setShowRenameModal(false);
      setOpened(false);
      onAfterRename?.(newKey);
    }
  };

  return (
    <>
      <DropdownMenu open={opened} onOpenChange={setOpened} modal={false}>
        <DropdownMenuTrigger asChild>
          {trigger ?? (
            <Button variant={"secondary"} size="icon-sm">
              <MoreHorizontalIcon />
            </Button>
          )}
        </DropdownMenuTrigger>
        <DropdownMenuContent>
          {onOpen && (
            <DropdownMenuItem onClick={onOpen}>
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
                    <span className="truncate block">
                      {format(
                        new Date(photo.LastModified),
                        "yyyy-MM-dd HH:mm:ss",
                      )}
                    </span>
                  </div>
                  <div className="text-sm items-center inline-flex">
                    <McKey2Line className="shrink-0 mr-2" />
                    <span title={photo.Key} className="truncate block">
                      {photo.Key}
                    </span>
                  </div>
                </div>
              </DropdownMenuSubContent>
            </DropdownMenuPortal>
          </DropdownMenuSub>
          <DropdownMenuItem onClick={operations.copyMarkdown}>
            <CopyIcon /> {t("copyMarkdown")}
          </DropdownMenuItem>
          <DropdownMenuItem onClick={operations.download}>
            <DownloadIcon /> {t("download")}
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => {
              setNewKey(photo.Key);
              setShowRenameModal(true);
            }}
          >
            <PencilIcon /> {t("rename")}
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => setShowDeleteConfirmModal(true)}>
            <Trash2Icon /> {t("delete")}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Rename Dialog */}
      <Dialog open={showRenameModal} onOpenChange={setShowRenameModal}>
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
                <span className="font-mono text-xs">{photo.Key}</span>
              </label>
              <Input
                id="newKey"
                value={newKey}
                onChange={(e) => setNewKey(e.target.value)}
                placeholder={t("renameModal.placeholder")}
                disabled={isRenaming}
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
              disabled={isRenaming}
            >
              {t("renameModal.cancel")}
            </Button>
            <Button onClick={handleRename} disabled={isRenaming}>
              {isRenaming ? t("renameModal.renaming") : t("renameModal.rename")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <Dialog
        open={showDeleteConfirmModal}
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
            <li>{photo.Key}</li>
          </ul>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowDeleteConfirmModal(false)}
            >
              {t("deleteModal.cancel")}
            </Button>
            <Button
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
