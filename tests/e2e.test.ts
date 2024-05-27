import { describe, test, expect } from "vitest";
import { setup, fetch } from "@nuxt/test-utils/e2e";

describe("Availability", async () => {
  await setup({
    // test context options
  });

  test("/", async () => {
    const res = await fetch("/");
    expect(res.status).toBe(200);
    const bodyText = await res.text();
    expect(bodyText).toContain("S3 Image Port");
  });
  test("/upload", async () => {
    const res = await fetch("/upload");
    expect(res.status).toBe(200);
    const bodyText = await res.text();
    expect(bodyText).toContain("Drop files here");
  });
  test("/settings", async () => {
    const res = await fetch("/settings");
    expect(res.status).toBe(200);
    const bodyText = await res.text();
    expect(bodyText).toContain("S3 Settings");
  });
});
