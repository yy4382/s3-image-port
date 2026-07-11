import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";
import { CircleDotDashed } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  loadLivePhotosKit,
  type LivePhotosKitPlayer,
} from "@/lib/live-photo/livephotoskit-loader";

/**
 * Renders an Apple Live Photo using Apple's LivePhotosKit JS player: the still
 * is shown with a LIVE badge and press-and-hold (or click) plays the motion.
 *
 * If the player fails to load, it degrades to a plain still `<img>` so the
 * photo is never blank.
 */
export function LivePhotoPlayer({
  photoSrc,
  videoSrc,
  className,
  alt,
}: {
  photoSrc: string;
  videoSrc: string;
  className?: string;
  alt?: string;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<LivePhotosKitPlayer | null>(null);
  const loggedErrorCountRef = useRef(0);
  const [status, setStatus] = useState<"loading" | "ready" | "error">(
    "loading",
  );

  useEffect(() => {
    const element = containerRef.current;
    if (!element) return;

    // `status` starts at "loading"; callers remount via `key` when the photo
    // changes, so there's no need to reset it synchronously here.
    let cancelled = false;
    let cleanupErrorWatcher: (() => void) | undefined;

    loadLivePhotosKit()
      .then((LivePhotosKit) => {
        if (cancelled || !containerRef.current) return;
        playerRef.current = LivePhotosKit.augmentElementAsPlayer(
          containerRef.current,
          {
            photoSrc,
            videoSrc,
            metadataVideoSrc: videoSrc,
            playbackStyle: LivePhotosKit.PlaybackStyle.FULL,
            proactivelyLoadsVideo: true,
            showsNativeControls: true,
          },
        );
        playerRef.current.updateSize(true);
        loggedErrorCountRef.current = 0;
        const errorInterval = window.setInterval(() => {
          const errors = playerRef.current?.errors ?? [];
          if (errors.length <= loggedErrorCountRef.current) return;
          loggedErrorCountRef.current = errors.length;
          console.error("Live Photo playback failed", {
            photoSrc,
            videoSrc,
            errors,
          });
          setStatus("error");
        }, 500);
        cleanupErrorWatcher = () => window.clearInterval(errorInterval);
        setStatus("ready");
      })
      .catch((error) => {
        if (cancelled) return;
        console.error("Failed to initialize Live Photo player", error);
        setStatus("error");
      });

    return () => {
      cancelled = true;
      cleanupErrorWatcher?.();
      try {
        playerRef.current?.pause();
      } catch {
        // ignore: player may not be initialized
      }
      playerRef.current = null;
      // LivePhotosKit injects its own DOM (canvas + badge) into the element;
      // clear it so a re-init (e.g. on src change) starts from a clean slate.
      element.replaceChildren();
    };
  }, [photoSrc, videoSrc]);

  useEffect(() => {
    const element = containerRef.current;
    if (!element) return;

    const observer = new ResizeObserver(() => {
      playerRef.current?.updateSize(true);
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  const play = useCallback(() => {
    const player = playerRef.current;
    if (!player || status !== "ready") return;
    player.play();
  }, [status]);

  return (
    <div
      className={cn("relative touch-none select-none", className)}
      onPointerDown={play}
    >
      <div ref={containerRef} className="size-full" />
      {status === "loading" && (
        <Skeleton className="absolute inset-0 size-full" />
      )}
      {status === "ready" && (
        <div className="pointer-events-none absolute bottom-4 left-4 z-10 flex items-center gap-1 rounded-md bg-black/45 px-2 py-1 text-xs font-medium uppercase text-white backdrop-blur-sm">
          <CircleDotDashed className="size-3.5" />
          Live
        </div>
      )}
      {status === "error" && (
        <img
          src={photoSrc}
          alt={alt}
          className="absolute inset-0 size-full object-contain select-none"
          draggable="false"
        />
      )}
    </div>
  );
}
