import { describe, test, expect } from "vitest";
import { setup, fetch } from "@nuxt/test-utils/e2e";

describe("Availability", async () => {
  await setup({
    // test context options
  });

  test("/", async () => {
    const res = await fetch("/");
    expect(res.status).toBe(200);
  });
  test("/upload", async () => {
    const res = await fetch("/upload");
    expect(res.status).toBe(200);
  });
  test("/settings", async () => {
    const res = await fetch("/settings/s3");
    expect(res.status).toBe(200);
  });
});
