import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import type { Photo } from "@/stores/schemas/photo";
import ImageS3Client from "@/lib/s3/image-s3-client";
import { s3Key2Url } from "@/lib/s3/s3-key";
import { useAtomValue } from "jotai";
import { useCallback, useEffect, useMemo, useState } from "react";
import { validS3SettingsAtom } from "@/stores/atoms/settings";
import { selectedPhotosAtom } from "@/stores/atoms/gallery";
import { motion } from "motion/react";
import { useHover } from "@uidotdev/usehooks";
import { useDelayedHover } from "@/lib/hooks/use-delayed-hover";
import { getRouteApi, useRouter } from "@tanstack/react-router";
import { useLocale, useTranslations } from "use-intl";
import { CircleDotDashed } from "lucide-react";
import { PhotoItemOverlay } from "./photo-item-overlay";
import { PhotoImg } from "./photo-img";
import { useLivePhotoVideo } from "../../hooks/use-photo-list";

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
  const [ref, hovering] = useHover();

  const [loadingState, setLoadingState] = useState<
    "loading" | "loaded" | "error"
  >("loading");

  const allSelected = useAtomValue(selectedPhotosAtom);
  const selected = useMemo(() => {
    return allSelected.has(photo.Key);
  }, [allSelected, photo.Key]);

  const isLivePhoto = useLivePhotoVideo(s3Key) !== undefined;

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
      {loadingState === "error" && <PhotoDisplayError s3Key={s3Key} />}
      {s3Settings && (
        <PhotoImg
          className={cn("transition-[scale] duration-75", {
            invisible: loadingState !== "loaded",
            "scale-90 rounded-lg": selected,
          })}
          s3Key={s3Key}
          url={s3Key2Url(s3Key, s3Settings)}
          setLoadingState={setLoadingState}
          width={size.width}
          height={size.height}
          draggable="false"
        />
      )}
      {loadingState === "loaded" && isLivePhoto && <LivePhotoBadge />}
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

function LivePhotoBadge() {
  const t = useTranslations("gallery.item");
  return (
    <div className="pointer-events-none absolute bottom-2 left-2 z-10 flex items-center gap-1 rounded-md bg-black/45 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-white backdrop-blur-sm">
      <CircleDotDashed className="size-3" />
      {t("livePhoto")}
    </div>
  );
}

/**
 * Prefetch the photo page when the photo is hovered for some time.
 * @param photo - The photo to prefetch.
 * @param hovering - Whether the photo is hovered.
 */
function usePrefetchPhotoPage(photo: Photo, hovering: boolean) {
  const router = useRouter();
  const locale = useLocale();
  const galleryState = JSON.stringify(route.useSearch());

  const delayedHoverCb = useCallback(() => {
    router.preloadRoute({
      to: "/$locale/photo",
      params: { locale },
      search: { imagePath: photo.Key, galleryState },
    });
  }, [router, photo.Key, galleryState, locale]);

  useDelayedHover(hovering, 200, delayedHoverCb);
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
