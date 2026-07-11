import { createStore } from "jotai";
import { selectAtom } from "jotai/utils";
import { describe, expect, it } from "vitest";

import { ControllableStorage } from "@/test/helpers/storage";
import {
  getDefaultOptions,
  getDefaultStoredSettings,
} from "@/stores/schemas/settings";
import { createCountedImageStorage } from "@/test/helpers/image-storage";
import { createDeferred } from "@/test/helpers/deterministic";
import { produce } from "immer";
import { imageCatalog } from "@/modules/image-catalog";
import { replaceSettingsProfileAtom } from "@/modules/settings/replace-profile";

import { createSettings, settings } from "./settings";

const catalogImagesAtom = selectAtom(
  imageCatalog.state,
  ({ projection }) => projection.images,
);
const catalogSelectionAtom = selectAtom(
  imageCatalog.view.selection,
  ({ keys }) => keys,
);

function validStorageSettings() {
  return {
    endpoint: "https://s3.example.com",
    bucket: "images",
    region: "us-east-1",
    accKeyId: "access-key",
    secretAccKey: "secret-key",
    forcePathStyle: false,
    pubUrl: "https://cdn.example.com",
    includePath: "gallery/",
  };
}

class SubscribableSettingsStorage extends ControllableStorage {
  private readonly subscribers = new Map<
    string,
    Set<(value: string | null) => void>
  >();

  readonly subscribe = (
    key: string,
    callback: (value: string | null) => void,
  ) => {
    const subscribers = this.subscribers.get(key) ?? new Set();
    subscribers.add(callback);
    this.subscribers.set(key, subscribers);
    return () => {
      subscribers.delete(callback);
      if (subscribers.size === 0) this.subscribers.delete(key);
    };
  };

  externalSet(key: string, value: string) {
    this.seed(key, value);
    for (const subscriber of this.subscribers.get(key) ?? []) {
      subscriber(value);
    }
  }
}

describe("settings interface", () => {
  it("keeps injected persistence lazy until the settings atom is mounted", () => {
    const persistence = new ControllableStorage({
      "s3ip:profiles-list": JSON.stringify({
        version: 3,
        data: {
          current: -1,
          list: [
            ["Persisted", getDefaultOptions()],
            ["Other", getDefaultOptions()],
          ],
        },
      }),
    });
    const settings = createSettings({ storage: persistence });
    const store = createStore();

    expect(persistence.getCalls).toEqual([]);
    expect(store.get(settings.profiles).profiles.list[0][0]).toBe("Default");
    expect(persistence.getCalls).toEqual([]);

    const unsubscribe = store.sub(settings.profiles, () => {});
    expect(persistence.getCalls).toEqual(["s3ip:profiles-list"]);
    expect(store.get(settings.profiles).profiles.list[0][0]).toBe("Persisted");
    expect(store.get(settings.profiles).profiles.current).toBe(0);
    expect(persistence.setCalls).toEqual([]);
    unsubscribe();
  });

  it("exposes five atoms and treats structurally equal focused writes as no-ops", () => {
    const persistence = new ControllableStorage();
    const settings = createSettings({ storage: persistence });
    const store = createStore();

    expect(Object.keys(settings)).toEqual([
      "profiles",
      "storage",
      "upload",
      "gallery",
      "replaceProfile",
    ]);

    const before = {
      profiles: store.get(settings.profiles),
      storage: store.get(settings.storage),
      upload: store.get(settings.upload),
      gallery: store.get(settings.gallery),
    };
    let storageNotifications = 0;
    let uploadNotifications = 0;
    const unsubscribeStorage = store.sub(settings.storage, () => {
      storageNotifications++;
    });
    const unsubscribeUpload = store.sub(settings.upload, () => {
      uploadNotifications++;
    });

    expect(
      store.set(settings.storage, {
        type: "update",
        value: structuredClone(before.storage.raw),
      }),
    ).toEqual({ status: "unchanged" });
    store.set(settings.upload, structuredClone(before.upload));

    expect(store.get(settings.profiles)).toBe(before.profiles);
    expect(store.get(settings.storage)).toBe(before.storage);
    expect(store.get(settings.upload)).toBe(before.upload);
    expect(store.get(settings.gallery)).toBe(before.gallery);
    expect(storageNotifications).toBe(0);
    expect(uploadNotifications).toBe(0);
    expect(persistence.setCalls).toEqual([]);

    store.set(settings.upload, (upload) => ({
      ...upload,
      keyTemplate: "archive/{{filename}}.{{ext}}",
    }));
    expect(store.get(settings.upload).keyTemplate).toBe(
      "archive/{{filename}}.{{ext}}",
    );
    expect(uploadNotifications).toBe(1);
    expect(storageNotifications).toBe(0);
    expect(store.get(settings.storage)).toBe(before.storage);
    expect(store.get(settings.gallery)).toBe(before.gallery);
    expect(persistence.setCalls).toHaveLength(1);

    unsubscribeStorage();
    unsubscribeUpload();
  });

  it("keeps raw storage edits beside stable validation, revision, and target projections", () => {
    const settings = createSettings({ storage: new ControllableStorage() });
    const store = createStore();
    const initial = store.get(settings.storage);
    const upload = store.get(settings.upload);
    const gallery = store.get(settings.gallery);
    const sync = store.get(settings.profiles).sync;

    expect(initial.validation.status).toBe("invalid");
    expect(initial.targetId).toBeUndefined();

    store.set(settings.storage, {
      type: "update",
      value: validStorageSettings(),
    });

    const valid = store.get(settings.storage);
    expect(valid.validation).toEqual({
      status: "valid",
      value: valid.raw,
    });
    expect(valid.revision).toBe(initial.revision + 1);
    expect(valid.targetId).toBe(
      JSON.stringify(["https://s3.example.com", "images", "gallery/"]),
    );
    expect(store.get(settings.upload)).toBe(upload);
    expect(store.get(settings.gallery)).toBe(gallery);
    expect(store.get(settings.profiles).sync).not.toBe(sync);

    const validation = valid.validation;
    const targetId = valid.targetId;
    store.set(settings.storage, {
      type: "update",
      value: (raw) => ({ ...raw, secretAccKey: "rotated-secret" }),
    });

    const rotated = store.get(settings.storage);
    expect(rotated.revision).toBe(valid.revision + 1);
    expect(rotated.targetId).toBe(targetId);
    expect(rotated.validation).not.toBe(validation);
    expect(rotated.validation.status).toBe("valid");
  });

  it("invalidates access for semantic persisted storage changes but not metadata", async () => {
    const hydrated = produce(getDefaultStoredSettings(), (draft) => {
      draft.list[0][1].s3 = validStorageSettings();
    });
    const persistence = new SubscribableSettingsStorage({
      "s3ip:profiles-list": JSON.stringify({ version: 3, data: hydrated }),
    });
    const imageStorage = createCountedImageStorage();
    const settings = createSettings({
      storage: persistence,
      createStorage: imageStorage.createStorage,
    });
    const store = createStore();
    const snapshots = [store.get(settings.storage)];
    const unsubscribe = store.sub(settings.storage, () => {
      snapshots.push(store.get(settings.storage));
    });

    expect(store.get(settings.storage).revision).toBe(1);
    expect(store.get(settings.storage).raw).toEqual(validStorageSettings());
    await store.set(settings.storage, { type: "test-access" });
    const tested = store.get(settings.storage);
    expect(tested.access).toMatchObject({ status: "success" });

    const metadataOnly = produce(
      store.get(settings.profiles).profiles,
      (draft) => {
        draft.list[draft.current][0] = "Renamed externally";
      },
    );
    persistence.externalSet(
      "s3ip:profiles-list",
      JSON.stringify({ version: 3, data: metadataOnly }),
    );
    expect(store.get(settings.storage).revision).toBe(tested.revision);
    expect(store.get(settings.storage).access).toBe(tested.access);
    snapshots.length = 0;

    const storageChanged = produce(metadataOnly, (draft) => {
      draft.list[draft.current][1].s3.bucket = "external-images";
    });
    persistence.externalSet(
      "s3ip:profiles-list",
      JSON.stringify({ version: 3, data: storageChanged }),
    );
    expect(store.get(settings.storage).revision).toBe(tested.revision + 1);
    expect(store.get(settings.storage).access).toEqual({ status: "idle" });
    expect(store.get(settings.storage).raw.bucket).toBe("external-images");
    const externalSnapshots = snapshots.filter(
      ({ raw }) => raw.bucket === "external-images",
    );
    expect(externalSnapshots.length).toBeGreaterThan(0);
    for (const snapshot of externalSnapshots) {
      expect(snapshot).toMatchObject({
        revision: tested.revision + 1,
        access: { status: "idle" },
      });
    }

    unsubscribe();
  });

  it("keeps profile parsing, outcomes, export, ordering, and sync projection behind one atom", () => {
    const settings = createSettings({ storage: new ControllableStorage() });
    const store = createStore();

    expect(
      store.set(settings.profiles, {
        type: "import",
        value: JSON.stringify({ name: "Work", data: getDefaultOptions() }),
      }),
    ).toEqual({ status: "imported", name: "Work" });
    expect(
      store.set(settings.profiles, {
        type: "import",
        value: { name: "Work", data: getDefaultOptions() },
      }),
    ).toEqual({ status: "name-exists", name: "Work" });
    expect(
      store.set(settings.profiles, {
        type: "duplicate",
        name: "Work",
        newName: "Work",
      }),
    ).toEqual({
      status: "duplicated",
      name: "Work",
      newName: "Work (copy 2)",
    });
    expect(
      store.set(settings.profiles, {
        type: "rename",
        oldName: "Missing",
        newName: "Other",
      }),
    ).toEqual({ status: "not-found", name: "Missing" });
    expect(
      store.set(settings.profiles, { type: "delete", name: "Default" }),
    ).toEqual({ status: "active-profile", name: "Default" });

    expect(
      store.set(settings.profiles, { type: "export", name: "Work" }),
    ).toEqual({
      status: "exported",
      name: "Work",
      value: JSON.stringify(
        { name: "Work", data: getDefaultOptions() },
        null,
        2,
      ),
    });
    expect(
      store.set(settings.profiles, { type: "import", value: "not json" }),
    ).toMatchObject({ status: "invalid" });

    expect(
      store.get(settings.profiles).profiles.list.map(([name]) => name),
    ).toEqual(["Default", "Work", "Work (copy 2)"]);
  });

  it("tests current valid storage once and refuses invalid storage without IO", async () => {
    const imageStorage = createCountedImageStorage();
    const settings = createSettings({
      storage: new ControllableStorage(),
      createStorage: imageStorage.createStorage,
      getOrigin: () => "https://app.example.com",
    });
    const store = createStore();

    await expect(
      store.set(settings.storage, { type: "test-access" }),
    ).resolves.toMatchObject({ status: "invalid-settings" });
    expect(imageStorage.calls.createStorage).toEqual([]);
    expect(imageStorage.calls.checkAccess).toEqual([]);

    store.set(settings.storage, {
      type: "update",
      value: validStorageSettings(),
    });
    store.set(settings.storage, {
      type: "update",
      value: (raw) => ({ ...raw, bucket: "current-images" }),
    });

    await expect(
      store.set(settings.storage, { type: "test-access" }),
    ).resolves.toEqual({
      status: "success",
      allowedMethods: ["GET", "HEAD", "PUT", "POST", "DELETE"],
    });
    expect(imageStorage.calls.createStorage).toEqual([
      expect.objectContaining({ bucket: "current-images" }),
    ]);
    expect(imageStorage.calls.checkAccess).toEqual([
      { origin: "https://app.example.com" },
    ]);
  });

  it("rejects stale and disposed access completion from visible state", async () => {
    const deferred = createDeferred<{
      ok: true;
      value: { allowedMethods: ["GET"] };
    }>();
    const imageStorage = createCountedImageStorage({
      overrides: { checkAccess: () => deferred.promise },
    });
    const settings = createSettings({
      storage: new ControllableStorage(),
      createStorage: imageStorage.createStorage,
      getOrigin: () => "https://app.example.com",
    });
    const store = createStore();
    store.set(settings.storage, {
      type: "update",
      value: validStorageSettings(),
    });
    const unsubscribe = store.sub(settings.storage, () => {});

    const result = store.set(settings.storage, { type: "test-access" });
    expect(store.get(settings.storage).access).toEqual({ status: "testing" });

    store.set(settings.storage, {
      type: "update",
      value: (raw) => ({ ...raw, secretAccKey: "rotated-secret" }),
    });
    expect(store.get(settings.storage).access).toEqual({ status: "idle" });
    unsubscribe();

    deferred.resolve({ ok: true, value: { allowedMethods: ["GET"] } });
    await expect(result).resolves.toEqual({
      status: "success",
      allowedMethods: ["GET"],
    });
    expect(store.get(settings.storage).access).toEqual({ status: "idle" });
    await expect(
      store.set(settings.storage, { type: "test-access" }),
    ).resolves.toEqual({ status: "disposed" });
    expect(imageStorage.calls.createStorage).toHaveLength(1);
    expect(imageStorage.calls.checkAccess).toHaveLength(1);
  });

  it("preserves CORS detail and structured access failures", async () => {
    const outcomes = [
      {
        ok: false as const,
        error: {
          reason: "cors-incomplete" as const,
          allowedMethods: ["GET" as const, "HEAD" as const],
          missingMethods: ["PUT" as const, "POST" as const, "DELETE" as const],
        },
      },
      {
        ok: false as const,
        error: { reason: "access-denied" as const },
      },
    ];
    const imageStorage = createCountedImageStorage({
      overrides: {
        checkAccess: async () => outcomes.shift()!,
      },
    });
    const settings = createSettings({
      storage: new ControllableStorage(),
      createStorage: imageStorage.createStorage,
    });
    const store = createStore();
    store.set(settings.storage, {
      type: "update",
      value: validStorageSettings(),
    });

    await expect(
      store.set(settings.storage, { type: "test-access" }),
    ).resolves.toEqual({
      status: "cors-incomplete",
      allowedMethods: ["GET", "HEAD"],
      missingMethods: ["PUT", "POST", "DELETE"],
    });
    await expect(
      store.set(settings.storage, { type: "test-access" }),
    ).resolves.toEqual({
      status: "failed",
      error: { reason: "access-denied" },
    });
    expect(store.get(settings.storage).access).toEqual({
      status: "failed",
      error: { reason: "access-denied" },
    });
    expect(imageStorage.calls.createStorage).toHaveLength(2);
    expect(imageStorage.calls.checkAccess).toHaveLength(2);
  });

  it("classifies only genuine active settings-profile replacement", () => {
    const persistence = new ControllableStorage();
    const settings = createSettings({ storage: persistence });
    const store = createStore();
    store.set(settings.profiles, {
      type: "import",
      value: { name: "Work", data: getDefaultOptions() },
    });
    expect(persistence.setCalls).toHaveLength(1);
    const syncBeforeActivation = store.get(settings.profiles).sync;
    const uploadBeforeActivation = store.get(settings.upload);
    const galleryBeforeActivation = store.get(settings.gallery);
    const storageBeforeActivation = store.get(settings.storage);

    expect(
      store.set(settings.replaceProfile, {
        type: "activate",
        name: "Missing",
      }),
    ).toEqual({
      status: "not-found",
      changed: false,
      profileReplaced: false,
    });
    expect(persistence.setCalls).toHaveLength(1);
    expect(
      store.set(settings.replaceProfile, {
        type: "activate",
        name: "Default",
      }),
    ).toEqual({
      status: "already-active",
      changed: false,
      profileReplaced: false,
      previousActiveName: "Default",
      nextActiveName: "Default",
    });
    expect(persistence.setCalls).toHaveLength(1);

    expect(
      store.set(settings.replaceProfile, {
        type: "activate",
        name: "Work",
      }),
    ).toEqual({
      status: "applied",
      changed: true,
      profileReplaced: true,
      previousActiveName: "Default",
      nextActiveName: "Work",
    });
    expect(persistence.setCalls).toHaveLength(2);
    expect(store.get(settings.profiles).sync).toBe(syncBeforeActivation);
    expect(store.get(settings.upload)).toBe(uploadBeforeActivation);
    expect(store.get(settings.gallery)).toBe(galleryBeforeActivation);
    expect(store.get(settings.storage)).toBe(storageBeforeActivation);

    const equalSync = store.get(settings.profiles).sync;
    expect(
      store.set(settings.replaceProfile, {
        type: "apply-sync",
        value: structuredClone(equalSync),
      }),
    ).toEqual({
      status: "unchanged",
      changed: false,
      profileReplaced: false,
      previousActiveName: "Work",
      nextActiveName: "Work",
    });
    expect(persistence.setCalls).toHaveLength(2);

    const inactiveOnly = produce(equalSync, (draft) => {
      draft.data.list[0][1].gallery.autoRefresh = false;
    });
    expect(
      store.set(settings.replaceProfile, {
        type: "apply-sync",
        value: inactiveOnly,
      }),
    ).toEqual({
      status: "applied",
      changed: true,
      profileReplaced: false,
      previousActiveName: "Work",
      nextActiveName: "Work",
    });
    expect(persistence.setCalls).toHaveLength(3);

    const activeChanged = produce(
      store.get(settings.profiles).sync,
      (draft) => {
        draft.data.list[1][1].gallery.autoRefresh = false;
      },
    );
    expect(
      store.set(settings.replaceProfile, {
        type: "apply-sync",
        value: activeChanged,
      }),
    ).toEqual({
      status: "applied",
      changed: true,
      profileReplaced: true,
      previousActiveName: "Work",
      nextActiveName: "Work",
    });
    expect(persistence.setCalls).toHaveLength(4);
  });

  it.each([-1, 0.5, 2])(
    "rejects imported current index %s before reading an active profile",
    (current) => {
      const settings = createSettings({ storage: new ControllableStorage() });
      const store = createStore();
      const before = store.get(settings.profiles);

      expect(
        store.set(settings.replaceProfile, {
          type: "apply-imported",
          value: {
            current,
            list: [
              ["Default", getDefaultOptions()],
              ["Work", getDefaultOptions()],
            ],
          },
        }),
      ).toMatchObject({
        status: "invalid",
        changed: false,
        profileReplaced: false,
      });
      expect(store.get(settings.profiles)).toBe(before);
    },
  );

  it("selects synced current by active name, then old index, then zero", () => {
    const settings = createSettings({ storage: new ControllableStorage() });
    const store = createStore();
    store.set(settings.replaceProfile, {
      type: "apply-imported",
      value: {
        current: 1,
        list: [
          ["A", getDefaultOptions()],
          ["B", getDefaultOptions()],
          ["C", getDefaultOptions()],
        ],
      },
    });

    store.set(settings.replaceProfile, {
      type: "apply-sync",
      value: {
        version: 3,
        data: {
          list: [
            ["B", getDefaultOptions()],
            ["A", getDefaultOptions()],
          ],
        },
      },
    });
    expect(store.get(settings.profiles).profiles.current).toBe(0);

    store.set(settings.replaceProfile, {
      type: "apply-imported",
      value: {
        current: 1,
        list: [
          ["P", getDefaultOptions()],
          ["Q", getDefaultOptions()],
        ],
      },
    });
    store.set(settings.replaceProfile, {
      type: "apply-sync",
      value: {
        version: 3,
        data: {
          list: [
            ["X", getDefaultOptions()],
            ["Y", getDefaultOptions()],
          ],
        },
      },
    });
    expect(store.get(settings.profiles).profiles.current).toBe(1);

    store.set(settings.replaceProfile, {
      type: "apply-sync",
      value: {
        version: 3,
        data: { list: [["Only", getDefaultOptions()]] },
      },
    });
    expect(store.get(settings.profiles).profiles.current).toBe(0);
  });

  it("treats active-name-only sync and imported changes as metadata", () => {
    const settings = createSettings({ storage: new ControllableStorage() });
    const store = createStore();

    const sync = produce(store.get(settings.profiles).sync, (draft) => {
      draft.data.list[0][0] = "Synced name";
    });
    expect(
      store.set(settings.replaceProfile, { type: "apply-sync", value: sync }),
    ).toMatchObject({
      status: "applied",
      changed: true,
      profileReplaced: false,
      previousActiveName: "Default",
      nextActiveName: "Synced name",
    });

    const imported = produce(store.get(settings.profiles).profiles, (draft) => {
      draft.list[0][0] = "Imported name";
    });
    expect(
      store.set(settings.replaceProfile, {
        type: "apply-imported",
        value: imported,
      }),
    ).toMatchObject({
      status: "applied",
      changed: true,
      profileReplaced: false,
      previousActiveName: "Synced name",
      nextActiveName: "Imported name",
    });
  });

  it("classifies equal-option active identity switches as replacements", () => {
    const settings = createSettings({ storage: new ControllableStorage() });
    const store = createStore();

    expect(
      store.set(settings.replaceProfile, {
        type: "apply-imported",
        value: {
          current: 1,
          list: [
            ["Default", getDefaultOptions()],
            ["Work", getDefaultOptions()],
          ],
        },
      }),
    ).toMatchObject({
      status: "applied",
      profileReplaced: true,
      previousActiveName: "Default",
      nextActiveName: "Work",
    });

    expect(
      store.set(settings.replaceProfile, {
        type: "apply-sync",
        value: {
          version: 3,
          data: { list: [["Fallback", getDefaultOptions()]] },
        },
      }),
    ).toMatchObject({
      status: "applied",
      profileReplaced: true,
      previousActiveName: "Work",
      nextActiveName: "Fallback",
    });
  });

  it("resets gallery state for equal-option imported and synced identity switches", () => {
    const store = createStore();
    store.set(imageCatalog.view.selection, {
      type: "toggle",
      key: "i/imported-before.webp",
      checked: true,
      shift: false,
    });

    expect(
      store.set(replaceSettingsProfileAtom, {
        type: "apply-imported",
        value: {
          current: 1,
          list: [
            ["Default", getDefaultOptions()],
            ["Work", getDefaultOptions()],
          ],
        },
      }),
    ).toMatchObject({ profileReplaced: true });
    expect(store.get(catalogImagesAtom)).toEqual([]);
    expect([...store.get(catalogSelectionAtom)]).toEqual([]);

    store.set(imageCatalog.view.selection, {
      type: "toggle",
      key: "i/synced-before.webp",
      checked: true,
      shift: false,
    });
    expect(
      store.set(replaceSettingsProfileAtom, {
        type: "apply-sync",
        value: {
          version: 3,
          data: { list: [["Fallback", getDefaultOptions()]] },
        },
      }),
    ).toMatchObject({ profileReplaced: true });
    expect(store.get(catalogImagesAtom)).toEqual([]);
    expect([...store.get(catalogSelectionAtom)]).toEqual([]);
  });

  it("routes genuine activation through one external gallery reset", () => {
    const store = createStore();
    const unsubscribeSettings = store.sub(settings.profiles, () => {});
    store.set(settings.profiles, {
      type: "import",
      value: { name: "Work", data: getDefaultOptions() },
    });
    let selectionResets = 0;
    let photoUpdates = 0;
    const unsubscribe = store.sub(catalogSelectionAtom, () => {
      selectionResets++;
    });
    const unsubscribePhotos = store.sub(catalogImagesAtom, () => {
      photoUpdates++;
    });
    store.set(imageCatalog.view.selection, {
      type: "toggle",
      key: "i/current.webp",
      checked: true,
      shift: false,
    });
    selectionResets = 0;
    photoUpdates = 0;

    expect(
      store.set(replaceSettingsProfileAtom, {
        type: "activate",
        name: "Work",
      }),
    ).toMatchObject({ status: "applied", profileReplaced: true });
    expect(store.get(catalogImagesAtom)).toEqual([]);
    expect([...store.get(catalogSelectionAtom)]).toEqual([]);
    expect(selectionResets).toBe(1);
    expect(photoUpdates).toBe(1);

    store.set(imageCatalog.view.selection, {
      type: "toggle",
      key: "i/after-activation.webp",
      checked: true,
      shift: false,
    });
    const renamedSync = produce(store.get(settings.profiles).sync, (draft) => {
      draft.data.list[draft.data.list.length - 1][0] = "Work metadata";
    });
    expect(
      store.set(replaceSettingsProfileAtom, {
        type: "apply-sync",
        value: renamedSync,
      }),
    ).toMatchObject({ profileReplaced: false });
    expect([...store.get(catalogSelectionAtom)]).toEqual([
      "i/after-activation.webp",
    ]);
    expect(selectionResets).toBe(2);
    expect(photoUpdates).toBe(1);

    const renamedImport = produce(
      store.get(settings.profiles).profiles,
      (draft) => {
        draft.list[draft.current][0] = "Work imported metadata";
      },
    );
    expect(
      store.set(replaceSettingsProfileAtom, {
        type: "apply-imported",
        value: renamedImport,
      }),
    ).toMatchObject({ profileReplaced: false });
    expect([...store.get(catalogSelectionAtom)]).toEqual([
      "i/after-activation.webp",
    ]);
    expect(selectionResets).toBe(2);
    expect(photoUpdates).toBe(1);

    expect(
      store.set(replaceSettingsProfileAtom, {
        type: "activate",
        name: "Work imported metadata",
      }),
    ).toMatchObject({ status: "already-active", profileReplaced: false });
    expect(selectionResets).toBe(2);
    expect(photoUpdates).toBe(1);
    unsubscribe();
    unsubscribePhotos();
    unsubscribeSettings();
  });
});
