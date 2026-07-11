import { describe, it, expect } from "vitest";
import { S3KeyMetadata } from "./s3-key";

/** Resolve the extension that `create` derives for the given file. */
function extOf(name: string, type: string): string {
  const file = new File([], name, { type });
  return S3KeyMetadata.create(file, "{{ext}}").data.ext;
}

describe("S3KeyMetadata.create ext resolution", () => {
  it("keeps the file's own extension instead of the MIME-derived one", () => {
    // `video/quicktime` maps to `qt`, but the file is named `.MOV`.
    expect(extOf("IMG_0001.MOV", "video/quicktime")).toBe("mov");
  });

  it("lowercases the file extension", () => {
    expect(extOf("PHOTO.JPG", "image/jpeg")).toBe("jpg");
  });

  it("uses the file extension even when it disagrees with the MIME type", () => {
    expect(extOf("clip.mp4", "video/quicktime")).toBe("mp4");
  });

  it("falls back to the MIME type when the name has no extension", () => {
    expect(extOf("IMG_0001", "video/quicktime")).toBe("qt");
    expect(extOf("photo", "image/jpeg")).toBe("jpg");
  });

  it("treats a leading-dot dotfile as having no extension", () => {
    // No filename extension and no resolvable MIME type -> empty.
    expect(extOf(".gitignore", "")).toBe("");
  });

  it("returns empty when neither the name nor the MIME type yields an ext", () => {
    expect(extOf("noext", "")).toBe("");
  });
});
