import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import type { StoredImage } from "@/modules/image-storage";
import { imageCatalog } from "@/modules/image-catalog";
import { useAtomValue, useSetAtom } from "jotai";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { motion } from "motion/react";
import { useHover } from "@uidotdev/usehooks";
import { useDelayedHover } from "@/lib/hooks/use-delayed-hover";
import { getRouteApi, useRouter } from "@tanstack/react-router";
import { useLocale } from "use-intl";
import { PhotoItemOverlay } from "./photo-item-overlay";
import { PhotoImg } from "./photo-img";

export function PhotoItem({
  photo,
  size,
  position,
}: {
  photo: StoredImage;
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
  photo: StoredImage;
  size: { width: number; height: number };
  position: { x: number; y: number };
}) {
  const s3Key = photo.key;
  const itemAtom = useMemo(() => imageCatalog.item(s3Key), [s3Key]);
  const item = useAtomValue(itemAtom);
  const [ref, hovering] = useHover();

  const source = item.access?.source;
  const [load, setLoad] = useState({
    source,
    status: "loading" as "loading" | "loaded" | "error",
  });
  const loadingState = load.source === source ? load.status : "loading";
  const setLoadingState = useCallback(
    (status: "loading" | "loaded" | "error") => {
      setLoad({ source, status });
    },
    [source],
  );

  usePrefetchPhotoPage(photo, hovering);

  return (
    <motion.div
      ref={ref}
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
      {loadingState === "error" && (
        <PhotoDisplayError s3Key={s3Key} access={item.access} />
      )}
      {source && (
        <PhotoImg
          className={cn("transition-[scale] duration-75", {
            invisible: loadingState !== "loaded",
            "scale-90 rounded-lg": item.selected,
          })}
          s3Key={s3Key}
          url={source}
          setLoadingState={setLoadingState}
          width={size.width}
          height={size.height}
          draggable="false"
        />
      )}
      {loadingState === "loaded" && source && (
        <PhotoItemOverlay
          photo={photo}
          selected={item.selected}
          hovering={hovering}
          reserved={item.reserved}
        />
      )}
    </motion.div>
  );
}

/**
 * Prefetch the photo page when the photo is hovered for some time.
 * @param photo - The photo to prefetch.
 * @param hovering - Whether the photo is hovered.
 */
function usePrefetchPhotoPage(photo: StoredImage, hovering: boolean) {
  const router = useRouter();
  const locale = useLocale();
  const galleryState = JSON.stringify(route.useSearch());

  const delayedHoverCb = useCallback(() => {
    router.preloadRoute({
      to: "/$locale/photo",
      params: { locale },
      search: { imagePath: photo.key, galleryState },
    });
  }, [router, photo.key, galleryState, locale]);

  useDelayedHover(hovering, 200, delayedHoverCb);
}

function PhotoDisplayError({
  s3Key,
  access,
}: {
  s3Key: string;
  access: { source: string } | undefined;
}) {
  const [mime, setMime] = useState<string | undefined>(undefined);
  const runCatalog = useSetAtom(imageCatalog.run);
  const mounted = useRef(false);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  const handleRefresh = useCallback(async () => {
    if (!access) return undefined;
    const outcome = await runCatalog({
      type: "access",
      key: s3Key,
      purpose: "probe",
    });
    return outcome.status === "accessed" && outcome.purpose === "probe"
      ? outcome.value.contentType
      : undefined;
  }, [access, runCatalog, s3Key]);

  useEffect(() => {
    let current = true;
    void handleRefresh().then((contentType) => {
      if (current) setMime(contentType);
    });
    return () => {
      current = false;
    };
  }, [handleRefresh]);

  return (
    <div className="size-full flex items-center justify-center border border-border bg-card">
      <div className="flex flex-col items-center justify-center gap-2">
        <p>Photo Load error</p>
        <p className="text-xs">Key: {s3Key}</p>
        <p className="text-xs">Mime: {mime ?? "loading..."}</p>
        <div className="flex gap-2">
          <Button
            onClick={async () => {
              const contentType = await handleRefresh();
              if (mounted.current) setMime(contentType);
            }}
            size="sm"
            disabled={!access}
          >
            Refresh
          </Button>
        </div>
      </div>
    </div>
  );
}
