import { LRUCache } from "lru-cache";

/**
 * Browser-side HEIC/HEIF rendering support.
 *
 * Apple devices export stills as HEIC, but only Safari 17+ can paint HEIC in an
 * `<img>` — Chrome/Firefox/Edge show a broken image. This module converts HEIC
 * to a JPEG object URL on demand (via the `heic-to` libheif-wasm wrapper) so the
 * gallery can display these photos everywhere, while leaving browsers that
 * already support HEIC untouched.
 */

/** Extensions treated as HEIC/HEIF. */
const HEIC_EXTENSIONS = ["heic", "heif"] as const;

/** Most cached conversions to keep; evicting one revokes its object URL. */
const CACHE_MAX = 24;

/** Max conversions running at once — libheif decoding is CPU-heavy. */
const MAX_CONCURRENT = 3;

/**
 * Whether a key or URL points at a HEIC/HEIF object, based on its extension.
 * Query strings and fragments are ignored so signed/CDN URLs still match.
 */
export function isHeicSource(src: string): boolean {
  const path = src.split(/[?#]/, 1)[0];
  const dot = path.lastIndexOf(".");
  if (dot < 0) return false;
  const ext = path.slice(dot + 1).toLowerCase();
  return (HEIC_EXTENSIONS as readonly string[]).includes(ext);
}

/**
 * Whether the current browser can render HEIC natively. Only Safari 17+ can; we
 * conservatively treat everything else (and SSR) as unsupported so it converts.
 */
export function isBrowserSupportHeic(): boolean {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent;
  // Exclude the Chromium/Gecko engines that also ship "Safari" in their UA.
  const isSafari =
    /^((?!chrome|chromium|crios|android|fxios|edg).)*safari/i.test(ua);
  if (!isSafari) return false;
  const version = Number.parseInt(ua.match(/version\/(\d+)/i)?.[1] ?? "0", 10);
  return version >= 17;
}

/** Whether `src` is HEIC and the browser can't paint it as-is. */
export function needsHeicConversion(src: string): boolean {
  return isHeicSource(src) && !isBrowserSupportHeic();
}

// --- Conversion (cache + in-flight dedup + concurrency limit) --------------

const cache = new LRUCache<string, string>({
  max: CACHE_MAX,
  // Revoking on eviction is safe: an already-loaded `<img>` keeps its decoded
  // bitmap, and a later re-mount misses the cache and re-converts.
  dispose: (objectUrl) => {
    URL.revokeObjectURL(objectUrl);
  },
});

const inflight = new Map<string, Promise<string>>();

let activeConversions = 0;
const waiters: Array<() => void> = [];

function acquireSlot(): Promise<void> {
  if (activeConversions < MAX_CONCURRENT) {
    activeConversions += 1;
    return Promise.resolve();
  }
  // Slot is handed directly to this waiter on release, so the count is unchanged.
  return new Promise<void>((resolve) => waiters.push(resolve));
}

function releaseSlot(): void {
  const next = waiters.shift();
  if (next) {
    next();
  } else {
    activeConversions -= 1;
  }
}

/**
 * Convert the HEIC at `src` to a JPEG object URL, returning a cached result when
 * one exists. Concurrent calls for the same `src` share a single conversion.
 *
 * `src` is fetched with `fetch`, so the bucket/CDN must allow cross-origin GETs
 * (the same CORS the S3 client already needs).
 */
export function getDisplayableHeicUrl(src: string): Promise<string> {
  const cached = cache.get(src);
  if (cached) return Promise.resolve(cached);

  const existing = inflight.get(src);
  if (existing) return existing;

  const task = (async () => {
    await acquireSlot();
    try {
      const response = await fetch(src);
      if (!response.ok) {
        throw new Error(`Failed to fetch HEIC (${response.status})`);
      }
      const blob = await response.blob();
      const { heicTo } = await import("heic-to");
      const converted = await heicTo({
        blob,
        type: "image/jpeg",
        quality: 0.92,
      });
      const objectUrl = URL.createObjectURL(converted);
      cache.set(src, objectUrl);
      return objectUrl;
    } finally {
      releaseSlot();
      inflight.delete(src);
    }
  })();

  inflight.set(src, task);
  return task;
}
