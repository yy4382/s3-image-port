import { describe, it, expect } from "vitest";
import {
  splitKeyExt,
  isLivePhotoVideoKey,
  pairLivePhotos,
  planLivePhotoUpload,
  uploadBaseName,
} from "./live-photo";
import type { Photo } from "@/stores/schemas/photo";

function photo(key: string): Photo {
  return { Key: key, LastModified: "2026-05-31T00:00:00.000Z", url: key };
}

describe("splitKeyExt", () => {
  it("splits a nested key into base and lowercased ext", () => {
    expect(splitKeyExt("i/2026/05/abc.JPG")).toEqual({
      base: "i/2026/05/abc",
      ext: "jpg",
    });
  });

  it("handles keys with no extension", () => {
    expect(splitKeyExt("i/2026/05/abc")).toEqual({
      base: "i/2026/05/abc",
      ext: "",
    });
  });

  it("ignores dots in directories and dotfiles", () => {
    expect(splitKeyExt("a.b/c/.hidden")).toEqual({
      base: "a.b/c/.hidden",
      ext: "",
    });
  });
});

describe("isLivePhotoVideoKey", () => {
  it("recognizes motion extensions case-insensitively", () => {
    expect(isLivePhotoVideoKey("i/x.MOV")).toBe(true);
    expect(isLivePhotoVideoKey("i/x.mp4")).toBe(true);
    expect(isLivePhotoVideoKey("i/x.jpg")).toBe(false);
  });
});

describe("pairLivePhotos", () => {
  it("pairs a still with its sibling motion and hides the video", () => {
    const photos = [photo("i/a.jpg"), photo("i/a.mov"), photo("i/b.png")];
    const { displayPhotos, videoByImageKey } = pairLivePhotos(photos);

    expect(displayPhotos.map((p) => p.Key)).toEqual(["i/a.jpg", "i/b.png"]);
    expect(videoByImageKey.get("i/a.jpg")?.Key).toBe("i/a.mov");
    expect(videoByImageKey.has("i/b.png")).toBe(false);
  });

  it("keeps standalone videos that have no matching still", () => {
    const photos = [photo("i/clip.mov"), photo("i/photo.jpg")];
    const { displayPhotos, videoByImageKey } = pairLivePhotos(photos);

    expect(displayPhotos.map((p) => p.Key)).toEqual([
      "i/clip.mov",
      "i/photo.jpg",
    ]);
    expect(videoByImageKey.size).toBe(0);
  });

  it("does not pair across different directories", () => {
    const photos = [photo("a/x.jpg"), photo("b/x.mov")];
    const { displayPhotos, videoByImageKey } = pairLivePhotos(photos);

    expect(displayPhotos).toHaveLength(2);
    expect(videoByImageKey.size).toBe(0);
  });

  it("returns an empty pairing for an empty list", () => {
    const { displayPhotos, videoByImageKey } = pairLivePhotos([]);
    expect(displayPhotos).toEqual([]);
    expect(videoByImageKey.size).toBe(0);
  });
});

describe("uploadBaseName", () => {
  it("strips directory and extension and lowercases", () => {
    expect(uploadBaseName("IMG_0001.HEIC")).toBe("img_0001");
    expect(uploadBaseName("folder/IMG_0001.MOV")).toBe("img_0001");
  });
});

describe("planLivePhotoUpload", () => {
  const file = (name: string, type: string) => ({ name, type });

  it("links a still and motion file sharing a basename", () => {
    const roles = planLivePhotoUpload([
      file("IMG_0001.HEIC", "image/heic"),
      file("IMG_0001.MOV", "video/quicktime"),
    ]);
    expect(roles[0]).toEqual({ type: "still" });
    expect(roles[1]).toEqual({ type: "motion", stillIndex: 0 });
  });

  it("links regardless of input order", () => {
    const roles = planLivePhotoUpload([
      file("IMG_0001.mov", "video/quicktime"),
      file("IMG_0001.jpg", "image/jpeg"),
    ]);
    expect(roles[1]).toEqual({ type: "still" });
    expect(roles[0]).toEqual({ type: "motion", stillIndex: 1 });
  });

  it("falls back to extension when MIME type is missing", () => {
    const roles = planLivePhotoUpload([
      file("clip.mov", ""),
      file("clip.jpg", ""),
    ]);
    expect(roles[1]).toEqual({ type: "still" });
    expect(roles[0]).toEqual({ type: "motion", stillIndex: 1 });
  });

  it("treats lone files as single uploads", () => {
    const roles = planLivePhotoUpload([
      file("a.jpg", "image/jpeg"),
      file("b.mov", "video/quicktime"),
    ]);
    expect(roles).toEqual([{ type: "single" }, { type: "single" }]);
  });
});
