import { cn } from "@/lib/utils";
import { profileGenerationAtom } from "@/modules/settings/profile-generation";
import { useAtomValue, useSetAtom, useStore } from "jotai";
import { useCallback, useEffect, useRef } from "react";
import {
  DEFAULT_IMAGE_SIZE,
  setNaturalSizesAtom,
} from "../../hooks/use-calculate-layout";

/**
 * <img> wrapper for displaying the photo image.
 *
 * It does:
 * - Handle the loading state ("loading", "loaded", "error").
 * - Cache the natural size.
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
  const store = useStore();
  const profileGeneration = useAtomValue(profileGenerationAtom);
  const setNaturalSizes = useSetAtom(setNaturalSizesAtom);

  const handleLoad = useCallback(() => {
    if (store.get(profileGenerationAtom) !== profileGeneration) return;
    if (!imgRef.current) return;
    const { naturalWidth, naturalHeight } = imgRef.current;
    if (naturalWidth === 0 || naturalHeight === 0) {
      return;
    }

    setNaturalSizes([s3Key, [naturalWidth, naturalHeight]]);
    setLoadingState("loaded");
  }, [profileGeneration, s3Key, setNaturalSizes, setLoadingState, store]);

  const handleError = useCallback(() => {
    if (store.get(profileGenerationAtom) !== profileGeneration) return;
    setNaturalSizes([s3Key, DEFAULT_IMAGE_SIZE]);
    setLoadingState("error");
  }, [profileGeneration, s3Key, setNaturalSizes, setLoadingState, store]);

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
