import { describe, expect, it, vi } from "vitest";

import {
  createDeferred,
  createStableIdGenerator,
  settle,
} from "./deterministic";

describe("deterministic test controls", () => {
  it("lets asynchronous work complete in either order", async () => {
    for (const order of [
      ["listing", "mutation"],
      ["mutation", "listing"],
    ] as const) {
      const listing = createDeferred<string>();
      const mutation = createDeferred<string>();
      const completions: string[] = [];
      const work = { listing, mutation };

      void listing.promise.then((value) => completions.push(value));
      void mutation.promise.then((value) => completions.push(value));
      for (const name of order) work[name].resolve(name);
      await settle();

      expect(completions).toEqual(order);
      expect(listing.settled).toBe(true);
      expect(mutation.settled).toBe(true);
    }
  });

  it("exposes rejected completion without hiding its settled state", async () => {
    const work = createDeferred<string>();
    work.reject(new Error("remote failed"));

    await expect(work.promise).rejects.toThrow("remote failed");
    expect(work.settled).toBe(true);
  });

  it("uses stable local IDs and settles microtasks plus relevant timers", async () => {
    vi.useFakeTimers();
    const nextId = createStableIdGenerator("pending-upload");
    const completions: string[] = [];

    expect([nextId(), nextId(), nextId()]).toEqual([
      "pending-upload-1",
      "pending-upload-2",
      "pending-upload-3",
    ]);

    queueMicrotask(() => completions.push("microtask"));
    setTimeout(() => completions.push("timer"), 20);

    await settle({
      timers: () => {
        vi.advanceTimersByTime(20);
      },
    });

    expect(completions).toEqual(["microtask", "timer"]);
    vi.useRealTimers();
  });
});
