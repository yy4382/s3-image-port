import type * as LivePhotosKit from "livephotoskit";

/**
 * Lazily loads Apple's official LivePhotosKit JS from the bundled npm package.
 *
 * The package touches browser globals at module evaluation time, so keep the
 * import dynamic and browser-only.
 */

export type LivePhotosKitPlayer = LivePhotosKit.Player;
export type LivePhotosKitGlobal = typeof LivePhotosKit;

let loadPromise: Promise<typeof LivePhotosKit> | null = null;

export function loadLivePhotosKit(): Promise<LivePhotosKitGlobal> {
  if (typeof window === "undefined") {
    return Promise.reject(
      new Error("LivePhotosKit can only be loaded in the browser"),
    );
  }
  if (loadPromise) {
    return loadPromise;
  }

  loadPromise = import("livephotoskit").catch((error) => {
    loadPromise = null;
    throw error;
  });

  return loadPromise;
}
