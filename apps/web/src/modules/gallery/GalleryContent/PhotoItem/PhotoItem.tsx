import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import type { Photo } from "@/lib/utils/ImageS3Client";
import ImageS3Client from "@/lib/utils/ImageS3Client";
import key2Url from "@/lib/utils/key2Url";
import { format } from "date-fns";
import { produce } from "immer";
import { atom, useAtomValue, useSetAtom } from "jotai";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import McCopy from "~icons/mingcute/copy-2-line.jsx";
import MingcuteInformationLine from "~icons/mingcute/information-line.jsx";
import McKey2Line from "~icons/mingcute/key-2-line.jsx";
import McTimeLine from "~icons/mingcute/time-line.jsx";
import McZoomIn from "~icons/mingcute/zoom-in-line.jsx";
import { validS3SettingsAtom } from "@/modules/settings/settings-store";
import {
  DEFAULT_IMAGE_SIZE,
  filteredPhotosAtom,
  selectModeAtom,
  selectedPhotosAtom,
} from "../../galleryStore";
import { setNaturalSizesAtom } from "../../galleryStore";
import { motion } from "motion/react";
import McCheckFill from "~icons/mingcute/checkbox-fill";
import { useHover, useMediaQuery } from "@uidotdev/usehooks";
import { useDelayedHover } from "@/lib/hooks/use-delayed-hover";
import { getRouteApi, useRouter } from "@tanstack/react-router";
import { useLocale } from "use-intl";

export function PhotoItem({
  photo,
  size,
  position,
}: {
  photo: Photo;
  size: { width: number; height: number };
  position: { x: number; y: number };
}) {
  return <PhotoDisplay photo={photo} size={size} position={position} />;
}

const route = getRouteApi("/$locale/_root-layout/gallery");
function PhotoDisplay({
  photo,
  size,
  position,
}: {
  photo: Photo;
  size: { width: number; height: number };
  position: { x: number; y: number };
}) {
  const s3Key = photo.Key;
  const s3Settings = useAtomValue(validS3SettingsAtom);
  const [wrapperRef, hovering] = useHover();

  const [loadingState, setLoadingState] = useState<
    "loading" | "loaded" | "error"
  >("loading");

  const allSelected = useAtomValue(selectedPhotosAtom);
  const selected = useMemo(() => {
    return allSelected.has(photo.Key);
  }, [allSelected, photo.Key]);

  const router = useRouter();
  const locale = useLocale();
  const search = route.useSearch();
  const galleryState = JSON.stringify(search);
  const delayedHoverCb = useCallback(() => {
    console.debug("prefetching page for", photo.Key);
    router.preloadRoute({
      to: "/$locale/photo",
      params: { locale },
      search: { imagePath: photo.Key, galleryState },
    });
  }, [router, photo.Key, galleryState, locale]);

  useDelayedHover(hovering, 200, delayedHoverCb);

  return (
    <motion.div
      ref={wrapperRef}
      className="overflow-hidden group absolute"
      style={{
        width: size.width,
        height: size.height,
        left: position.x,
        top: position.y,
      }}
      layout="preserve-aspect"
      transition={{ ease: "easeInOut", duration: 0.2 }}
    >
      {loadingState === "loading" && <Skeleton className="w-full h-full" />}
      {loadingState === "error" && <PhotoDisplayError s3Key={s3Key} />}
      {s3Settings && (
        <PhotoImg
          className={cn("transition-[scale] duration-75", {
            invisible: loadingState !== "loaded",
            "scale-90 rounded-lg": selected,
          })}
          s3Key={s3Key}
          url={key2Url(s3Key, s3Settings)}
          setLoadingState={setLoadingState}
          width={size.width}
          height={size.height}
          draggable="false"
        />
      )}
      {loadingState === "loaded" && (
        <PhotoItemOverlay
          photo={photo}
          selected={selected}
          hovering={hovering}
        />
      )}
    </motion.div>
  );
}

/**
 * Display the photo image, handle the loading state, and cache the natural size.
 */
export function PhotoImg({
  s3Key,
  url,
  setLoadingState,
  ...props
}: {
  s3Key: string;
  url: string;
  setLoadingState: (state: "loading" | "loaded" | "error") => void;
} & React.ComponentProps<"img">) {
  const imgRef = useRef<HTMLImageElement>(null);
  const setNaturalSizes = useSetAtom(setNaturalSizesAtom);

  const handleLoad = useCallback(() => {
    if (!imgRef.current) return;
    const { naturalWidth, naturalHeight } = imgRef.current;
    if (naturalWidth === 0 || naturalHeight === 0) {
      return;
    }

    setNaturalSizes([s3Key, [naturalWidth, naturalHeight]]);
    setLoadingState("loaded");
    // setTimeout(() => {
    // setLoadingState("loaded");
    // }, 50);
  }, [s3Key, setNaturalSizes, setLoadingState]);

  const handleError = useCallback(() => {
    setNaturalSizes([s3Key, DEFAULT_IMAGE_SIZE]);
    setLoadingState("error");
  }, [s3Key, setNaturalSizes, setLoadingState]);

  useEffect(() => {
    if (imgRef.current?.complete) {
      handleLoad();
    }
  }, [handleLoad]);

  return (
    <img
      {...props}
      ref={imgRef}
      src={url}
      alt={s3Key}
      onLoad={handleLoad}
      onError={handleError}
    />
  );
}

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

function PhotoDisplayError({ s3Key }: { s3Key: string }) {
  const [mime, setMime] = useState<string | undefined>(undefined);
  const s3Settings = useAtomValue(validS3SettingsAtom);

  const handleRefresh = useCallback(() => {
    if (!s3Settings) return;
    const resp = new ImageS3Client(s3Settings).head(s3Key);
    resp.then((res) => {
      setMime(res.ContentType ?? undefined);
    });
  }, [s3Key, s3Settings]);

  useEffect(() => {
    handleRefresh();
  }, [handleRefresh]);

  return (
    <div className="size-full flex items-center justify-center border border-border bg-card">
      <div className="flex flex-col items-center justify-center gap-2">
        <p>Photo Load error</p>
        <p className="text-xs">Key: {s3Key}</p>
        <p className="text-xs">Mime: {mime ?? "loading..."}</p>
        <div className="flex gap-2">
          <Button onClick={handleRefresh} size="sm">
            Refresh
          </Button>
        </div>
      </div>
    </div>
  );
}

const toggleSelectedAtom = atom(
  null,
  (get, set, key: string, check: boolean | "toggle", shift: boolean) => {
    if (check === undefined) {
      const oldSet = get(selectedPhotosAtom);
      let newSet = new Set(oldSet);
      if (oldSet.has(key)) {
        newSet.delete(key);
      } else {
        if (shift) {
          newSet = getShiftSelected(get(filteredPhotosAtom), newSet, key);
        } else {
          newSet.add(key);
        }
      }
      set(selectedPhotosAtom, newSet);
    } else {
      const oldSet = get(selectedPhotosAtom);
      let newSet = new Set(oldSet);
      if (check) {
        if (shift) {
          newSet = getShiftSelected(get(filteredPhotosAtom), newSet, key);
        } else {
          newSet.add(key);
        }
      } else {
        newSet.delete(key);
      }
      set(selectedPhotosAtom, newSet);
    }
  },
);

const getShiftSelected = (
  photoList: readonly Photo[],
  currentSelected: Set<string>,
  key: string,
) => {
  const lastSelected = [...currentSelected].pop();
  if (!lastSelected) {
    return new Set([key]);
  }
  const lastSelectedIndex = photoList.findIndex((p) => p.Key === lastSelected);
  const currentSelectingIndex = photoList.findIndex((p) => p.Key === key);
  if (lastSelectedIndex === -1 || currentSelectingIndex === -1) {
    return currentSelected;
  }
  const startIndex = Math.min(lastSelectedIndex, currentSelectingIndex);
  const endIndex = Math.max(lastSelectedIndex, currentSelectingIndex);
  const newSet = produce(currentSelected, (draft) => {
    for (let i = startIndex; i <= endIndex; i++) {
      draft.add(photoList[i].Key);
    }
  });
  return newSet;
};

type PhotoItemOverlayProps = {
  photo: Photo;
  selected: boolean;
  hovering: boolean;
};

function PhotoItemOverlay({
  photo,
  selected,
  hovering,
}: PhotoItemOverlayProps) {
  const selectMode = useAtomValue(selectModeAtom);
  const toggleSelected = useSetAtom(toggleSelectedAtom);
  function copy(photo: Photo) {
    navigator.clipboard.writeText(photo.url);
    toast.success("Copied to clipboard");
  }
  const onOpenModal = useOpenModal(photo.Key);

  const isTouch = useMediaQuery("(pointer: coarse)");
  const [touchOverlayShow, setTouchOverlayShow] = useState(false);
  const showOverlay = useMemo(() => {
    return hovering || (isTouch && touchOverlayShow) || selected;
  }, [hovering, isTouch, touchOverlayShow, selected]);

  return (
    <motion.div
      className="absolute inset-0 z-20"
      animate={{
        visibility: showOverlay ? "visible" : "hidden",
        opacity: showOverlay ? 1 : 0,
      }}
      onTouchStart={() => {
        setTouchOverlayShow(true);
      }}
      transition={{ ease: "easeInOut", duration: 0.15 }}
    >
      <div
        className="absolute top-0 bottom-0 left-0 right-0"
        onClick={(e) => {
          if (selectMode) {
            console.log("selectMode");
            toggleSelected(photo.Key, "toggle", e.shiftKey);
          } else if (isTouch) {
            setTouchOverlayShow(!touchOverlayShow);
          } else {
            onOpenModal();
          }
        }}
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
          "!opacity-100 !pointer-events-auto": selected,
        })}
      />
      <div className="absolute left-4 bottom-4">
        <PhotoInfo photo={photo}></PhotoInfo>
      </div>
      {isTouch || !selectMode ? (
        <PhotoActionCopyLink
          onCopyLink={() => copy(photo)}
          className="absolute bottom-4 right-4"
        />
      ) : (
        <PhotoActionOpenModal
          className="absolute bottom-4 right-4"
          onOpenModal={onOpenModal}
        />
      )}
      {isTouch && (
        <PhotoActionOpenModal
          className="absolute top-4 right-4"
          onOpenModal={onOpenModal}
        />
      )}
    </motion.div>
  );
}

function PhotoActionOpenModal({
  className,
  onOpenModal,
}: {
  className?: string;
  onOpenModal: () => void;
}) {
  return (
    <Button
      aria-label="Open fullscreen"
      variant="secondary"
      size="icon"
      className={className}
      onClick={(e) => {
        e.stopPropagation();
        onOpenModal();
      }}
    >
      <McZoomIn />
    </Button>
  );
}

function PhotoActionCopyLink({
  className,
  onCopyLink,
}: {
  className?: string;
  onCopyLink: () => void;
}) {
  return (
    <Button
      aria-label="Copy link"
      variant="secondary"
      size="icon"
      className={className}
      onClick={(e) => {
        e.stopPropagation();
        onCopyLink();
      }}
    >
      <McCopy />
    </Button>
  );
}

function PhotoInfo({ photo }: { photo: Photo }) {
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button variant={"secondary"} size="icon">
            <MingcuteInformationLine />
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          <div className="flex flex-col space-y-1 flex-shrink basis-0 flex-grow min-w-0 p-2">
            <div className="text-sm items-center inline-flex">
              <McTimeLine className="shrink-0 mr-2" />
              <span className="truncate block">
                {format(new Date(photo.LastModified), "yyyy-MM-dd HH:mm:ss")}
              </span>
            </div>
            <div className="text-sm items-center inline-flex">
              <McKey2Line className="shrink-0 mr-2" />
              <span title={photo.Key} className="truncate block">
                {photo.Key}
              </span>
            </div>
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
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
