import { createStore } from "jotai";
import { describe, expect, it } from "vitest";
import { createSettings } from "./settings";
import { createCountedImageStorage } from "@/test/helpers/image-storage";
import { createDeferred } from "@/test/helpers/deterministic";
import { ControllableStorage } from "@/test/helpers/storage";

const options = {
  endpoint: "https://s3.example.com",
  bucket: "images",
  region: "auto",
  accKeyId: "key",
  secretAccKey: "secret",
  includePath: "prefix",
  forcePathStyle: true,
  pubUrl: "https://cdn.example.com",
};
const success = {
  ok: true as const,
  value: { httpStatus: 200, originMatched: true, missingMethods: [] as [] },
};

for (const operation of ["test-access", "check-cors"] as const) {
  describe(`${operation} target and lifetime safety`, () => {
    it.each([
      "endpoint",
      "bucket",
      "includePath",
      "profile",
      "retest",
      "unmount",
    ])("aborts and rejects stale completion after %s", async (change) => {
      const deferred = createDeferred<typeof success>();
      let pending = false;
      const imageStorage = createCountedImageStorage({
        overrides: {
          checkAccess: async () =>
            pending && operation === "test-access" ? deferred.promise : success,
          checkCors: async () =>
            pending && operation === "check-cors" ? deferred.promise : success,
        },
      });
      const settings = createSettings({
        storage: new ControllableStorage(),
        createStorage: imageStorage.createStorage,
        getOrigin: () => "https://panel.example.com:8443",
      });
      const store = createStore();
      store.set(settings.storage, { type: "update", value: options });
      let unsubscribe = store.sub(settings.storage, () => {});
      if (operation === "check-cors")
        await store.set(settings.storage, { type: "test-access" });
      pending = true;
      const promise = store.set(settings.storage, { type: operation });
      const calls =
        operation === "test-access"
          ? imageStorage.calls.checkAccess
          : imageStorage.calls.checkCors;
      const signal = calls.at(-1)!.signal!;
      expect(signal.aborted).toBe(false);
      if (change === "profile") {
        const name = store.get(settings.profiles).profiles.list[0][0];
        store.set(settings.profiles, {
          type: "duplicate",
          name,
          newName: "same-target",
        });
        store.set(settings.replaceProfile, {
          type: "activate",
          name: "same-target",
        });
      } else if (change === "retest") {
        pending = false;
        await store.set(settings.storage, { type: operation });
      } else if (change === "unmount") {
        unsubscribe();
        unsubscribe = store.sub(settings.storage, () => {});
      } else {
        store.set(settings.storage, {
          type: "update",
          value: (raw) => ({
            ...raw,
            [change]:
              change === "endpoint"
                ? "https://other.example.com"
                : "new-target",
          }),
        });
      }
      expect(signal.aborted).toBe(true);
      const access = store.get(settings.storage).access;
      const cors = store.get(settings.storage).cors;
      deferred.resolve(success);
      await promise;
      expect(store.get(settings.storage).access).toBe(access);
      expect(store.get(settings.storage).cors).toBe(cors);
      if (change !== "retest") {
        expect(access.status).toBe("idle");
        expect(cors.status).toBe("idle");
      }
      expect(imageStorage.calls.listStoredImages).toBe(0);
      expect(imageStorage.calls.putStoredImage).toEqual([]);
      unsubscribe();
    });
  });
}

it("retesting the list also cancels a pending CORS check", async () => {
  const deferred = createDeferred<typeof success>();
  const imageStorage = createCountedImageStorage({
    overrides: { checkCors: () => deferred.promise },
  });
  const settings = createSettings({
    storage: new ControllableStorage(),
    createStorage: imageStorage.createStorage,
  });
  const store = createStore();
  store.set(settings.storage, { type: "update", value: options });
  await store.set(settings.storage, { type: "test-access" });
  const cors = store.set(settings.storage, { type: "check-cors" });
  await store.set(settings.storage, { type: "test-access" });
  expect(imageStorage.calls.checkCors[0].signal?.aborted).toBe(true);
  deferred.resolve(success);
  await cors;
  expect(store.get(settings.storage).access.status).toBe("success");
  expect(store.get(settings.storage).cors.status).toBe("idle");
});
