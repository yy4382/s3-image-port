import type { Photo } from "@/stores/schemas/photo";

/**
 * Apple Live Photos are stored as two objects that share a basename: a still
 * image (`IMG_0001.jpg`/`.heic`) and a motion video (`IMG_0001.mov`). This
 * module pairs them back together purely from their S3 keys, so the gallery can
 * render the still + motion together instead of listing the bare `.mov` (which
 * an `<img>` can't display).
 */

/** Extensions treated as the motion component of a Live Photo. */
export const LIVE_PHOTO_VIDEO_EXTENSIONS = ["mov", "mp4", "m4v"] as const;

/** Extensions treated as the still component of a Live Photo. */
const STILL_IMAGE_EXTENSIONS = [
  "jpg",
  "jpeg",
  "png",
  "webp",
  "avif",
  "gif",
  "heic",
  "heif",
] as const;

/**
 * Split a key into its base (path without extension) and lowercased extension.
 *
 * `"i/2026/05/abc.JPG"` -> `{ base: "i/2026/05/abc", ext: "jpg" }`
 */
export function splitKeyExt(key: string): { base: string; ext: string } {
  const lastSlash = key.lastIndexOf("/");
  const dir = key.slice(0, lastSlash + 1);
  const filename = key.slice(lastSlash + 1);
  const dotIdx = filename.lastIndexOf(".");
  // A leading dot (dotfile) or no dot means there is no extension to split.
  if (dotIdx <= 0) {
    return { base: key, ext: "" };
  }
  return {
    base: dir + filename.slice(0, dotIdx),
    ext: filename.slice(dotIdx + 1).toLowerCase(),
  };
}

export function isLivePhotoVideoKey(key: string): boolean {
  const { ext } = splitKeyExt(key);
  return (LIVE_PHOTO_VIDEO_EXTENSIONS as readonly string[]).includes(ext);
}

function isStillImageKey(key: string): boolean {
  const { ext } = splitKeyExt(key);
  return (STILL_IMAGE_EXTENSIONS as readonly string[]).includes(ext);
}

export type LivePhotoPairing = {
  /**
   * Photos to actually render in the grid. The motion `.mov` of a paired Live
   * Photo is removed (it's surfaced through its still instead); everything else
   * — including standalone videos that have no matching still — is kept as-is.
   */
  displayPhotos: Photo[];
  /** Map from a still image key to its paired motion video. */
  videoByImageKey: Map<string, Photo>;
};

const EMPTY_PAIRING: LivePhotoPairing = {
  displayPhotos: [],
  videoByImageKey: new Map(),
};

/**
 * Pair still images with their sibling motion videos by shared key base.
 *
 * A base counts as a Live Photo only when it has both a still image and a
 * motion video. When several stills share a base (unusual), each is paired with
 * the same video; when several videos share a base, the first is used.
 */
export function pairLivePhotos(photos: Photo[]): LivePhotoPairing {
  if (photos.length === 0) return EMPTY_PAIRING;

  const byBase = new Map<string, { images: Photo[]; videos: Photo[] }>();
  for (const photo of photos) {
    const { base } = splitKeyExt(photo.Key);
    let entry = byBase.get(base);
    if (!entry) {
      entry = { images: [], videos: [] };
      byBase.set(base, entry);
    }
    if (isLivePhotoVideoKey(photo.Key)) {
      entry.videos.push(photo);
    } else if (isStillImageKey(photo.Key)) {
      entry.images.push(photo);
    }
  }

  const videoByImageKey = new Map<string, Photo>();
  const pairedVideoKeys = new Set<string>();
  for (const { images, videos } of byBase.values()) {
    if (images.length === 0 || videos.length === 0) continue;
    const video = videos[0];
    for (const image of images) {
      videoByImageKey.set(image.Key, video);
    }
    pairedVideoKeys.add(video.Key);
  }

  if (pairedVideoKeys.size === 0) {
    return { displayPhotos: photos, videoByImageKey };
  }

  return {
    displayPhotos: photos.filter((photo) => !pairedVideoKeys.has(photo.Key)),
    videoByImageKey,
  };
}

// --- Upload-side pairing ---------------------------------------------------
// When a user drops a Live Photo's two original files (e.g. `IMG_0001.HEIC` +
// `IMG_0001.MOV`) together, we want them stored under a shared key base so they
// pair again on listing. These helpers identify the still + motion files of a
// single drop by their basename.

type UploadFile = { name: string; type: string };

function classifyUploadKind(file: UploadFile): "image" | "video" | "other" {
  if (file.type.startsWith("video/")) return "video";
  if (file.type.startsWith("image/")) return "image";
  // Fall back to the extension when the browser provides no MIME type.
  const { ext } = splitKeyExt(file.name);
  if ((LIVE_PHOTO_VIDEO_EXTENSIONS as readonly string[]).includes(ext)) {
    return "video";
  }
  if ((STILL_IMAGE_EXTENSIONS as readonly string[]).includes(ext)) {
    return "image";
  }
  return "other";
}

/** Basename without directory or extension, lowercased, for pairing. */
export function uploadBaseName(name: string): string {
  const slash = Math.max(name.lastIndexOf("/"), name.lastIndexOf("\\"));
  const filename = name.slice(slash + 1);
  const dot = filename.lastIndexOf(".");
  return (dot > 0 ? filename.slice(0, dot) : filename).toLowerCase();
}

export type UploadRole =
  | { type: "single" }
  | { type: "still" }
  | { type: "motion"; stillIndex: number };

/**
 * Decide, for each file in a single upload batch, whether it is part of a Live
 * Photo pair. A basename becomes a pair only when it has both a still image and
 * a motion video; the first still and first motion are linked, any extras are
 * treated as standalone files.
 *
 * Returns one {@link UploadRole} per input file, in the same order.
 */
export function planLivePhotoUpload(files: UploadFile[]): UploadRole[] {
  const byBase = new Map<string, { still: number[]; motion: number[] }>();
  files.forEach((file, index) => {
    const kind = classifyUploadKind(file);
    if (kind === "other") return;
    const base = uploadBaseName(file.name);
    let entry = byBase.get(base);
    if (!entry) {
      entry = { still: [], motion: [] };
      byBase.set(base, entry);
    }
    if (kind === "video") entry.motion.push(index);
    else entry.still.push(index);
  });

  const roles: UploadRole[] = files.map(() => ({ type: "single" }));
  for (const { still, motion } of byBase.values()) {
    if (still.length === 0 || motion.length === 0) continue;
    const stillIndex = still[0];
    roles[stillIndex] = { type: "still" };
    roles[motion[0]] = { type: "motion", stillIndex };
  }
  return roles;
}
