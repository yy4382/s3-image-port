import {
  photosAtom,
  selectedPhotosAtom,
  selectModeAtom,
} from "@/routes/gallery";
import type { Photo } from "@/utils/ImageS3Client";
import { atom, useAtom, useAtomValue, useSetAtom } from "jotai";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { PaginationWithLogic } from "@/components/ui/paginationLogic";
import * as z from "zod";
import { useS3SettingsValue } from "@/routes/settings/s3";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import key2Url from "@/utils/key2Url";
import ImageS3Client from "@/utils/ImageS3Client";
import { Button } from "@/components/ui/button";
import { produce } from "immer";
import { ImageCheckbox } from "../ui/checkbox";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "../ui/tooltip";
import { format } from "date-fns";
import MingcuteInformationLine from "~icons/mingcute/information-line";
import McTimeLine from "~icons/mingcute/time-line";
import McKey2Line from "~icons/mingcute/key-2-line";
import McZoomIn from "~icons/mingcute/zoom-in-line";
import McCopy from "~icons/mingcute/copy-2-line";
import { toast } from "sonner";

const PER_PAGE = 20;

const currentPageAtom = atom(1);

const showingPhotosAtom = atom<Photo[]>((get) => {
  const photos = get(photosAtom);
  const start = (get(currentPageAtom) - 1) * PER_PAGE;
  const end = start + PER_PAGE;
  return photos.slice(start, end);
});
const photosLengthAtom = atom((get) => get(photosAtom).length);
export function PhotoGrid() {
  const photos = useAtomValue(showingPhotosAtom);
  const allPhotosLength = useAtomValue(photosLengthAtom);
  const [page, setPage] = useAtom(currentPageAtom);
  const photoSize = useAtomValue(photoSizeAtom);
  const setContainerWidth = useSetAtom(containerWidthAtom);
  const containerRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const handleResize = (width: number) => {
      setContainerWidth(width);
    };

    const debouncedSetWidth = debounce(handleResize, 30); // Debounce by 200ms

    setContainerWidth(containerRef.current?.clientWidth ?? 600); // Set initial width immediately

    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        if (entry.target === containerRef.current) {
          debouncedSetWidth(entry.contentRect.width);
        }
      }
    });

    observer.observe(containerRef.current!);
  }, [setContainerWidth]);
  return (
    <div ref={containerRef} className="max-w-full">
      {photos.length > 0 ? (
        <div className="grid gap-4 w-full">
          <div className="flex flex-wrap gap-2 w-full">
            {photos.map((photo, i) => (
              <PhotoItem key={photo.Key} photo={photo} size={photoSize[i]} />
            ))}
          </div>
          <PaginationWithLogic
            page={page}
            totalCount={allPhotosLength}
            pageSize={PER_PAGE}
            onPageChange={(p) => {
              setPage(p);
            }}
          />
        </div>
      ) : (
        <p>No photos found</p>
      )}
    </div>
  );
}

const debounce = <F extends (...args: number[]) => unknown>(
  func: F,
  waitFor: number,
) => {
  let timeoutId: ReturnType<typeof setTimeout> | null = null;

  return (...args: Parameters<F>): void => {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }

    timeoutId = setTimeout(() => func(...args), waitFor);
  };
};

const naturalSizesAtom = atom<Map<string, [number, number]>>(new Map());
const setNaturalSizesAtom = atom(
  null,
  (get, set, inputAction: [string, [number, number]]) => {
    const validated = z
      .tuple([z.string(), z.tuple([z.number(), z.number()])])
      .safeParse(inputAction);
    if (!validated.success) {
      return;
    }
    const action = validated.data;
    const map = get(naturalSizesAtom);
    if (action) {
      map.set(action[0], action[1]);
      set(naturalSizesAtom, new Map(map));
    }
  },
);

const containerWidthAtom = atom(300);
const DEFAULT_IMAGE_SIZE: [number, number] = [384, 208];
const GAP_PX = 8;

const photoSizeAtom = atom((get) => {
  const originalSizes = get(showingPhotosAtom).map((photo) => {
    const size = get(naturalSizesAtom).get(photo.Key);
    if (size) {
      const ratio = size[0] / size[1];
      return [DEFAULT_IMAGE_SIZE[1] * ratio, DEFAULT_IMAGE_SIZE[1]] as [
        number,
        number,
      ];
    }
    return DEFAULT_IMAGE_SIZE;
  });

  const grouped: [number, number][][] = [];
  let curWidth = 0;
  let curGroup: [number, number][] = [];
  originalSizes.forEach((size) => {
    if (curWidth + size[0] + GAP_PX > get(containerWidthAtom)) {
      // this element will be put in the next line
      // scale & push the current line
      scaleCurGroup(curGroup, get(containerWidthAtom), GAP_PX);
      grouped.push(curGroup);
      // start a new line (reset cur* variables)
      curWidth = 0;
      curGroup = [];
    }
    curWidth += size[0] + GAP_PX;
    curGroup.push(size);
  });
  if (curGroup.length > 1)
    // if there is only one element in the last line, no need to scale
    scaleCurGroup(curGroup, get(containerWidthAtom), GAP_PX);
  grouped.push(curGroup);
  return grouped.flat();
});

const scaleCurGroup = (
  curGroup: [number, number][],
  wrapperWidth: number,
  gap: number,
) => {
  const widthWithoutGap = wrapperWidth - gap * (curGroup.length - 1);
  const scale =
    widthWithoutGap / curGroup.reduce((acc, [width]) => acc + width, 0);
  curGroup.forEach(([width, height], index) => {
    curGroup[index] = [width * scale, height * scale];
  });
};

function PhotoItem({ photo, size }: { photo: Photo; size: [number, number] }) {
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
  const imgRef = useRef<HTMLImageElement>(null);
  const setNaturalSizes = useSetAtom(setNaturalSizesAtom);
  const s3Settings = useS3SettingsValue();

  const [loadingState, setLoadingState] = useState<
    "loading" | "loaded" | "error"
  >("loading");

  const handleLoad = useCallback(() => {
    if (!imgRef.current) return;
    const { naturalWidth, naturalHeight } = imgRef.current;
    if (naturalWidth === 0 || naturalHeight === 0) {
      return;
    }

    setNaturalSizes([s3Key, [naturalWidth, naturalHeight]]);
    // setLoadingState("loaded");
    setTimeout(() => {
      setLoadingState("loaded");
    }, 50);
  }, [s3Key, setNaturalSizes]);

  const handleError = useCallback(() => {
    setLoadingState("error");
  }, []);

  useEffect(() => {
    if (imgRef.current?.complete) {
      handleLoad();
    }
  }, [handleLoad]);

  const allSelected = useAtomValue(selectedPhotosAtom);
  const selected = useMemo(() => {
    return allSelected.has(photo.Key);
  }, [allSelected, photo.Key]);

  return (
    <div
      ref={wrapperRef}
      className="overflow-hidden transition-all group"
      style={{ width: size[0], height: size[1] }}
    >
      {loadingState === "loading" && <Skeleton className="w-full h-full" />}
      {loadingState === "error" && <PhotoDisplayError s3Key={s3Key} />}
      {loadingState === "loaded" && (
        <div className="absolute inset-0 z-20">
          {/* TODO: add modal */}
          <PhotoItemOverlay
            photo={photo}
            selected={selected}
            onOpenModal={() => {}}
          />
        </div>
      )}
      {s3Settings && (
        <img
          ref={imgRef}
          className={cn("transition-[scale]", {
            invisible: loadingState !== "loaded",
            "scale-90 rounded-lg": selected,
          })}
          src={key2Url(s3Key, s3Settings)}
          onLoad={handleLoad}
          onError={handleError}
          draggable="false"
        ></img>
      )}
    </div>
  );
}

function PhotoDisplayError({ s3Key }: { s3Key: string }) {
  const [mime, setMime] = useState<string | undefined>(undefined);
  const s3Settings = useS3SettingsValue();

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
        style={{
          backgroundImage:
            "linear-gradient(to bottom,rgba(0, 0, 0, 0.5),transparent 50px,transparent)",
          backgroundSize: "100% 100%",
        }}
        onClick={() => {
          if (selectMode) toggleSelected(photo.Key);
          else onOpenModal();
        }}
      />
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
        onClick={() => {
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
        <TooltipTrigger>
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
