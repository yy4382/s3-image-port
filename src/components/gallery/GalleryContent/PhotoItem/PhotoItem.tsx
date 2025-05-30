import { Button } from "@/components/ui/button";
import { ImageCheckbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import type { Photo } from "@/utils/ImageS3Client";
import ImageS3Client from "@/utils/ImageS3Client";
import key2Url from "@/utils/key2Url";
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
import { validS3SettingsAtom } from "@/components/settings/settingsStore";
import {
  DEFAULT_IMAGE_SIZE,
  selectModeAtom,
  selectedPhotosAtom,
} from "../../galleryStore";
import { setNaturalSizesAtom } from "../../galleryStore";
import { useRouter } from "@/i18n/navigation";
import { useSearchParams } from "next/navigation";

export function PhotoItem({
  photo,
  size,
}: {
  photo: Photo;
  size: [number, number];
}) {
  return (
    <div className="relative">
      <PhotoDisplay photo={photo} size={size} />
    </div>
  );
}

function PhotoDisplay({
  photo,
  size,
}: {
  photo: Photo;
  size: [number, number];
}) {
  const s3Key = photo.Key;
  const wrapperRef = useRef<HTMLDivElement>(null);
  const s3Settings = useAtomValue(validS3SettingsAtom);

  const [loadingState, setLoadingState] = useState<
    "loading" | "loaded" | "error"
  >("loading");

  const allSelected = useAtomValue(selectedPhotosAtom);
  const selected = useMemo(() => {
    return allSelected.has(photo.Key);
  }, [allSelected, photo.Key]);

  const handleOpenModal = useOpenModal(photo.Key);

  return (
    <div
      ref={wrapperRef}
      className="overflow-hidden transition-all duration-75 group"
      style={{ width: size[0], height: size[1] }}
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
          width={size[0]}
          height={size[1]}
          draggable="false"
        />
      )}
      {loadingState === "loaded" && (
        <div className="absolute inset-0 z-20">
          <PhotoItemOverlay
            photo={photo}
            selected={selected}
            onOpenModal={handleOpenModal}
          />
        </div>
      )}
    </div>
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
  const search = useSearchParams();
  const router = useRouter();

  return useCallback(() => {
    if (!s3Key) return;
    const newSearch = new URLSearchParams(search);
    newSearch.set("imagePath", s3Key);

    router.push(`/photo?${newSearch.toString()}`);
  }, [search, s3Key, router]);
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
  (get, set, key: string, check?: boolean) => {
    if (check === undefined) {
      const newSet = produce(get(selectedPhotosAtom), (draft) => {
        if (draft.has(key)) {
          draft.delete(key);
        } else {
          draft.add(key);
        }
      });
      set(selectedPhotosAtom, newSet);
    } else {
      const newSet = produce(get(selectedPhotosAtom), (draft) => {
        if (check) {
          draft.add(key);
        } else {
          draft.delete(key);
        }
      });
      set(selectedPhotosAtom, newSet);
    }
  },
);

type PhotoItemOverlayProps = {
  photo: Photo;
  selected: boolean;
  onOpenModal: () => void;
};

function PhotoItemOverlay({
  photo,
  selected,
  onOpenModal,
}: PhotoItemOverlayProps) {
  const selectMode = useAtomValue(selectModeAtom);
  const toggleSelected = useSetAtom(toggleSelectedAtom);
  function copy(photo: Photo) {
    navigator.clipboard.writeText(photo.url);
    toast.success("Copied to clipboard");
  }
  return (
    <>
      <div
        className="absolute top-0 bottom-0 left-0 right-0 hover-to-show"
        onClick={() => {
          if (selectMode) toggleSelected(photo.Key);
          else onOpenModal();
        }}
      >
        <div className="absolute top-0 h-14 left-0 right-0 bg-gradient-to-bottom" />
      </div>
      <ImageCheckbox
        checked={selected}
        onCheckedChange={(c) => {
          toggleSelected(photo.Key, !!c);
        }}
        className={cn("absolute top-2 left-2 hover-to-show", {
          "!opacity-100 !pointer-events-auto": selected,
        })}
      />
      <div className="hover-to-show absolute left-4 bottom-4">
        <PhotoInfo photo={photo}></PhotoInfo>
      </div>
      <Button
        aria-label={selectMode ? "Open fullscreen" : "Copy Link"}
        className="absolute bottom-4 right-4 hover-to-show"
        size={"icon"}
        variant="secondary"
        onClick={(e) => {
          e.stopPropagation();
          if (selectMode) onOpenModal();
          else copy(photo);
        }}
      >
        {" "}
        {selectMode ? <McZoomIn /> : <McCopy />}
      </Button>
    </>
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
