import { describe, it, expect } from "vitest";
import {
  isHeicSource,
  isBrowserSupportHeic,
  needsHeicConversion,
} from "./heic";

describe("isHeicSource", () => {
  it("matches .heic and .heif case-insensitively", () => {
    expect(isHeicSource("i/2026/05/IMG_0001.HEIC")).toBe(true);
    expect(isHeicSource("i/2026/05/IMG_0001.heif")).toBe(true);
  });

  it("rejects non-HEIC extensions", () => {
    expect(isHeicSource("i/a.jpg")).toBe(false);
    expect(isHeicSource("i/a.png")).toBe(false);
    expect(isHeicSource("i/a")).toBe(false);
  });

  it("ignores query strings and fragments on URLs", () => {
    expect(isHeicSource("https://cdn.example.com/a.heic?v=2#x")).toBe(true);
    expect(isHeicSource("https://cdn.example.com/a.jpg?ext=.heic")).toBe(false);
  });
});

describe("isBrowserSupportHeic", () => {
  // The test runner is Chromium, which cannot render HEIC natively.
  it("is false on non-Safari browsers", () => {
    expect(isBrowserSupportHeic()).toBe(false);
  });
});

describe("needsHeicConversion", () => {
  it("requires conversion for HEIC on this (non-Safari) browser", () => {
    expect(needsHeicConversion("i/a.heic")).toBe(true);
  });

  it("never converts non-HEIC sources", () => {
    expect(needsHeicConversion("i/a.jpg")).toBe(false);
  });
});
