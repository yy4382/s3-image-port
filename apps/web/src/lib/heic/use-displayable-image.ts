import { useEffect, useState } from "react";
import { getDisplayableHeicUrl, needsHeicConversion } from "./heic";

export type DisplayableImageStatus = "ready" | "converting" | "error";

export interface DisplayableImage {
  /** A URL safe to render in `<img>`, or `undefined` while converting/on error. */
  src: string | undefined;
  status: DisplayableImageStatus;
}

/** The outcome of a finished conversion, tagged with the input it was made for. */
interface ResolvedState {
  source: string;
  src: string | undefined;
  status: "ready" | "error";
}

/**
 * Resolve a source URL into one the current browser can actually paint.
 *
 * Non-HEIC sources (and HEIC on browsers with native support) pass through
 * synchronously. HEIC that needs conversion reports `status: "converting"`
 * until a JPEG object URL is ready, then `"ready"`; failures yield `"error"`.
 *
 * Pass `undefined` to disable resolution (e.g. before settings are loaded).
 */
export function useDisplayableImage(src: string | undefined): DisplayableImage {
  const shouldConvert = !!src && needsHeicConversion(src);
  const [resolved, setResolved] = useState<ResolvedState | null>(null);

  useEffect(() => {
    if (!shouldConvert) return;

    let cancelled = false;
    getDisplayableHeicUrl(src)
      .then((url) => {
        if (!cancelled) setResolved({ source: src, src: url, status: "ready" });
      })
      .catch((error) => {
        if (cancelled) return;
        console.error("HEIC conversion failed", error);
        setResolved({ source: src, src: undefined, status: "error" });
      });

    return () => {
      cancelled = true;
    };
  }, [shouldConvert, src]);

  // Pass-through case stays synchronous so non-HEIC images never flash a state.
  if (!shouldConvert) return { src, status: "ready" };
  // Until the effect resolves for *this* src, we're converting. Deriving this at
  // render time (rather than via setState in the effect) avoids cascading renders
  // and keeps a stale result from a previous src out of the picture.
  if (resolved && resolved.source === src) {
    return { src: resolved.src, status: resolved.status };
  }
  return { src: undefined, status: "converting" };
}
