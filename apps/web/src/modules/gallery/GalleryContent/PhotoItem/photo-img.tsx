import { cn } from "@/lib/utils";
import { useSetAtom } from "jotai";
import { useCallback, useEffect, useRef } from "react";
import {
  DEFAULT_IMAGE_SIZE,
  setNaturalSizesAtom,
} from "../../hooks/use-calculate-layout";
import { useDisplayableImage } from "@/lib/heic/use-displayable-image";

/**
 * <img> wrapper for displaying the photo image.
 *
 * It does:
 * - Convert HEIC/HEIF to a paintable URL on browsers that can't render it.
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
  const setNaturalSizes = useSetAtom(setNaturalSizesAtom);
  // Resolve HEIC to a JPEG object URL where the browser can't paint it natively.
  const { src, status: convertStatus } = useDisplayableImage(url);

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

  // Mirror the conversion lifecycle onto the loading state: "converting" keeps
  // the skeleton up, a failed conversion surfaces the error state. A successful
  // conversion ("ready") hands off to the <img> onLoad/onError below.
  useEffect(() => {
    if (convertStatus === "converting") {
      setLoadingState("loading");
    } else if (convertStatus === "error") {
      handleError();
    }
  }, [convertStatus, setLoadingState, handleError]);

  useEffect(() => {
    if (imgRef.current?.complete) {
      handleLoad();
    }
  }, [handleLoad, src]);

  // Nothing paintable yet (converting or failed): let the parent show its
  // skeleton/error UI via the loading state set above.
  if (!src) return null;

  return (
    <img
      {...props}
      className={cn("select-none", props.className)}
      ref={imgRef}
      src={src}
      alt={s3Key}
      onLoad={handleLoad}
      onError={handleError}
    />
  );
}
