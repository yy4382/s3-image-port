import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import type { Photo } from "@/lib/utils/ImageS3Client";
import ImageS3Client from "@/lib/utils/ImageS3Client";
import key2Url from "@/lib/utils/key2Url";
import { useAtomValue, useSetAtom } from "jotai";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { validS3SettingsAtom } from "@/modules/settings/settings-store";
import {
  DEFAULT_IMAGE_SIZE,
  setNaturalSizesAtom,
} from "../../use-calculate-layout";
import { selectedPhotosAtom } from "../../use-select";
import { motion } from "motion/react";
import { useHover } from "@uidotdev/usehooks";
import { useDelayedHover } from "@/lib/hooks/use-delayed-hover";
import { getRouteApi, useRouter } from "@tanstack/react-router";
import { useLocale } from "use-intl";
import { PhotoItemOverlay } from "./photo-item-overlay";

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
      className={cn("select-none", props.className)}
      ref={imgRef}
      src={url}
      alt={s3Key}
      onLoad={handleLoad}
      onError={handleError}
    />
  );
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
