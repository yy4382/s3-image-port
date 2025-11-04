import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { Photo } from "@/lib/utils/ImageS3Client";
import { getRouteApi } from "@tanstack/react-router";
import { useSetAtom } from "jotai";
import { motion } from "motion/react";
import { useCallback, useMemo, useState } from "react";
import { toast } from "sonner";
import { useLocale } from "use-intl";
import McCheckFill from "~icons/mingcute/checkbox-fill";
import McCopy from "~icons/mingcute/copy-2-line.jsx";
import { toggleSelectedAtom } from "../../use-select";
import { PhotoOptions } from "./photo-options";

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
        <PhotoOptions
          photo={photo}
          opened={infoDropdownOpened}
          setOpened={setInfoDropdownOpened}
          onOpen={onOpenModal}
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
