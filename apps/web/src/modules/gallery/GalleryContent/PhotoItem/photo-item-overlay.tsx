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
import { cn } from "@/lib/utils";
import type { Photo } from "@/lib/utils/ImageS3Client";
import { getRouteApi } from "@tanstack/react-router";
import { format } from "date-fns";
import { useSetAtom } from "jotai";
import {
  ExpandIcon,
  MoreHorizontalIcon,
  PencilIcon,
  Trash2Icon,
} from "lucide-react";
import { motion } from "motion/react";
import { useCallback, useMemo, useState } from "react";
import { toast } from "sonner";
import { useLocale } from "use-intl";
import McCheckFill from "~icons/mingcute/checkbox-fill";
import McCopy from "~icons/mingcute/copy-2-line.jsx";
import MingcuteInformationLine from "~icons/mingcute/information-line.jsx";
import McKey2Line from "~icons/mingcute/key-2-line.jsx";
import McTimeLine from "~icons/mingcute/time-line.jsx";
import { useDeletePhotos } from "../../use-delete";
import { useRenamePhoto } from "../../use-rename";
import { toggleSelectedAtom } from "../../use-select";

type PhotoItemOverlayProps = {
  photo: Photo;
  selected: boolean;
  hovering: boolean;
};

export function PhotoItemOverlay({
  photo,
  selected,
  hovering,
}: PhotoItemOverlayProps) {
  const toggleSelected = useSetAtom(toggleSelectedAtom);
  const onOpenModal = useOpenModal(photo.Key);
  const [infoDropdownOpened, setInfoDropdownOpened] = useState(false);

  const showOverlay = useMemo(() => {
    return hovering || selected || infoDropdownOpened;
  }, [hovering, selected, infoDropdownOpened]);

  return (
    <motion.div
      className="absolute inset-0 z-20"
      animate={{
        visibility: showOverlay ? "visible" : "hidden",
        opacity: showOverlay ? 1 : 0,
      }}
      transition={{ ease: "easeInOut", duration: 0.15 }}
    >
      {/* The gray background */}
      <div
        className="absolute top-0 bottom-0 left-0 right-0"
        onClick={(e) => {
          toggleSelected(photo.Key, "toggle", e.shiftKey);
        }}
        onDoubleClick={onOpenModal}
      >
        <div className="absolute top-0 h-14 left-0 right-0 bg-gradient-to-bottom" />
      </div>

      <ImageCheckbox
        checked={selected}
        onCheckedChange={(c, e) => {
          toggleSelected(
            photo.Key,
            !!c,
            (e.nativeEvent as PointerEvent).shiftKey,
          );
        }}
        className={cn("absolute top-2 left-2", {
          "opacity-100! pointer-events-auto!": selected,
        })}
      />
      <div className="absolute right-4 top-4 flex items-center gap-2">
        <PhotoActionCopyLink photo={photo} />
        <PhotoInfo
          photo={photo}
          opened={infoDropdownOpened}
          setOpened={setInfoDropdownOpened}
        />
      </div>
    </motion.div>
  );
}

function PhotoActionCopyLink({
  className,
  photo,
}: {
  className?: string;
  photo: Photo;
}) {
  function copy(photo: Photo) {
    navigator.clipboard.writeText(photo.url);
    toast.success("Copied to clipboard");
  }
  return (
    <Button
      aria-label="Copy link"
      variant="secondary"
      size="icon-sm"
      className={className}
      onClick={(e) => {
        e.stopPropagation();
        copy(photo);
      }}
    >
      <McCopy />
    </Button>
  );
}

function PhotoInfo({
  photo,
  opened,
  setOpened,
}: {
  photo: Photo;
  opened: boolean;
  setOpened: (opened: boolean) => void;
}) {
  const openModal = useOpenModal(photo.Key);
  const deletePhotos = useDeletePhotos();
  const renamePhoto = useRenamePhoto();
  const deleteFn = useCallback(async () => {
    await deletePhotos(photo.Key);
  }, [deletePhotos, photo.Key]);

  const [showDeleteConfirmModal, setShowDeleteConfirmModal] = useState(false);
  const [showRenameModal, setShowRenameModal] = useState(false);
  const [newKey, setNewKey] = useState(photo.Key);
  const [isRenaming, setIsRenaming] = useState(false);

  const handleRename = useCallback(async () => {
    setIsRenaming(true);
    const result = await renamePhoto(photo.Key, newKey);
    setIsRenaming(false);

    if (result.success) {
      setShowRenameModal(false);
      setOpened(false);
    }
    // Don't close modal on error - let user fix the input
  }, [renamePhoto, photo.Key, newKey, setOpened]);

  return (
    <>
      <DropdownMenu open={opened} onOpenChange={setOpened} modal={false}>
        <DropdownMenuTrigger asChild>
          <Button variant={"secondary"} size="icon-sm">
            <MoreHorizontalIcon />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent>
          <DropdownMenuItem onClick={openModal}>
            <ExpandIcon /> Open
          </DropdownMenuItem>
          <DropdownMenuSub>
            <DropdownMenuSubTrigger>
              <MingcuteInformationLine /> Info
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
          <DropdownMenuItem
            onClick={() => {
              setNewKey(photo.Key);
              setShowRenameModal(true);
            }}
          >
            <PencilIcon /> Rename
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => setShowDeleteConfirmModal(true)}>
            <Trash2Icon /> Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Rename Dialog */}
      <Dialog open={showRenameModal} onOpenChange={setShowRenameModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rename Photo</DialogTitle>
            <DialogDescription>
              Enter a new name (key) for this photo. This will be the full path
              in your S3 bucket.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <label htmlFor="newKey" className="text-sm font-medium">
                Current: <span className="font-mono text-xs">{photo.Key}</span>
              </label>
              <Input
                id="newKey"
                value={newKey}
                onChange={(e) => setNewKey(e.target.value)}
                placeholder="Enter new key/path"
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
              Cancel
            </Button>
            <Button onClick={handleRename} disabled={isRenaming}>
              {isRenaming ? "Renaming..." : "Rename"}
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
            <DialogTitle>Delete Confirm</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this item?
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
              Cancel
            </Button>
            <Button
              onClick={() => {
                deleteFn();
                setShowDeleteConfirmModal(false);
              }}
            >
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

function ImageCheckbox({
  className,
  checked,
  onCheckedChange,
}: {
  defaultChecked?: boolean;
  className?: string;
  checked?: boolean;
  onCheckedChange: (
    checked: boolean,
    event: React.MouseEvent<HTMLButtonElement>,
  ) => void;
}) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={checked}
      data-state={checked ? "checked" : "unchecked"}
      className={cn(
        "peer relative group data-[state=checked]:text-primary text-white/80 hover:text-white focus-visible:border-ring focus-visible:ring-ring/50 size-8 shrink-0 outline-none focus-visible:ring-[3px] disabled:cursor-not-allowed disabled:opacity-50",
        className,
      )}
      onClick={(e) => {
        e.preventDefault();
        onCheckedChange(!checked, e);
      }}
    >
      <div className="inset-[5px] absolute group-data-[state=checked]:bg-white dark:group-data-[state=checked]:bg-black z-10"></div>
      <span className="flex items-center justify-center text-current transition-none">
        <McCheckFill className="size-8 z-20" />
      </span>
    </button>
  );
}

const route = getRouteApi("/$locale/_root-layout/gallery");
function useOpenModal(s3Key: string) {
  const search = route.useSearch();
  const navigate = route.useNavigate();
  const locale = useLocale();

  return useCallback(() => {
    if (!s3Key) return;

    navigate({
      to: "/$locale/photo",
      params: { locale },
      search: { imagePath: s3Key, galleryState: JSON.stringify(search) },
    });
  }, [search, s3Key, locale, navigate]);
}
