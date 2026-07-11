import { Provider, createStore, useAtomValue, type Atom } from "jotai";
import { selectAtom } from "jotai/utils";
import type { PropsWithChildren } from "react";
import { describe, expect, it } from "vitest";
import { renderHook } from "vitest-browser-react";

import { imageCatalog } from "@/modules/image-catalog";
import { getDefaultOptions } from "@/stores/schemas/settings";
import { createDeferred, settle } from "@/test/helpers/deterministic";
import { createCountedImageStorage } from "@/test/helpers/image-storage";
import { ControllableStorage } from "@/test/helpers/storage";

import { createSettings } from "./settings";

const validStorage = {
  endpoint: "https://s3.example.com",
  bucket: "images",
  region: "us-east-1",
  accKeyId: "access-key",
  secretAccKey: "secret-key",
  forcePathStyle: false,
  pubUrl: "https://cdn.example.com",
  includePath: "gallery/",
};

describe("settings React reactivity", () => {
  it("updates only the relevant profile, storage, upload, gallery, access, and catalog readers", async () => {
    const access = createDeferred<{
      ok: true;
      value: { allowedMethods: ["GET"] };
    }>();
    const imageStorage = createCountedImageStorage({
      overrides: { checkAccess: () => access.promise },
    });
    const persistence = new ControllableStorage();
    const settings = createSettings({
      storage: persistence,
      createStorage: imageStorage.createStorage,
      getOrigin: () => "https://app.example.com",
    });
    const store = createStore();
    const rawAtom = selectAtom(settings.storage, ({ raw }) => raw);
    const validationAtom = selectAtom(
      settings.storage,
      ({ validation }) => validation,
    );
    const accessAtom = selectAtom(settings.storage, ({ access }) => access);
    const catalogSelectionAtom = selectAtom(
      imageCatalog.view.selection,
      ({ keys }) => keys,
    );
    function Wrapper({ children }: PropsWithChildren) {
      return <Provider store={store}>{children}</Provider>;
    }
    async function watch<T>(target: Atom<T>) {
      let renders = 0;
      const hook = await renderHook(
        () => {
          renders++;
          return useAtomValue(target);
        },
        { wrapper: Wrapper },
      );
      return { hook, count: () => renders };
    }

    const readers = {
      profiles: await watch(settings.profiles),
      raw: await watch(rawAtom),
      validation: await watch(validationAtom),
      access: await watch(accessAtom),
      upload: await watch(settings.upload),
      gallery: await watch(settings.gallery),
      catalog: await watch(catalogSelectionAtom),
    };
    const counts = () =>
      Object.fromEntries(
        Object.entries(readers).map(([name, reader]) => [name, reader.count()]),
      );
    const delta = (before: ReturnType<typeof counts>) =>
      Object.fromEntries(
        Object.entries(counts()).map(([name, count]) => [
          name,
          count - before[name],
        ]),
      );

    await settle();
    let before = counts();
    await readers.raw.hook.act(() => {
      store.set(settings.storage, { type: "update", value: validStorage });
    });
    expect(readers.raw.hook.result.current.bucket).toBe("images");
    expect(readers.validation.hook.result.current.status).toBe("valid");
    expect(delta(before)).toEqual({
      profiles: 1,
      raw: 1,
      validation: 1,
      access: 0,
      upload: 0,
      gallery: 0,
      catalog: 0,
    });
    expect(persistence.setCalls).toHaveLength(1);

    before = counts();
    await readers.upload.hook.act(() => {
      store.set(settings.upload, (upload) => ({
        ...upload,
        keyTemplate: "reactivity/{{filename}}.{{ext}}",
      }));
    });
    expect(delta(before)).toEqual({
      profiles: 1,
      raw: 0,
      validation: 0,
      access: 0,
      upload: 1,
      gallery: 0,
      catalog: 0,
    });
    expect(persistence.setCalls).toHaveLength(2);

    before = counts();
    await readers.gallery.hook.act(() => {
      store.set(settings.gallery, (gallery) => ({
        ...gallery,
        autoRefresh: !gallery.autoRefresh,
      }));
    });
    expect(delta(before)).toEqual({
      profiles: 1,
      raw: 0,
      validation: 0,
      access: 0,
      upload: 0,
      gallery: 1,
      catalog: 0,
    });
    expect(persistence.setCalls).toHaveLength(3);

    before = counts();
    await readers.profiles.hook.act(() => {
      store.set(settings.profiles, {
        type: "import",
        value: { name: "Work", data: getDefaultOptions() },
      });
    });
    expect(delta(before)).toEqual({
      profiles: 1,
      raw: 0,
      validation: 0,
      access: 0,
      upload: 0,
      gallery: 0,
      catalog: 0,
    });
    expect(persistence.setCalls).toHaveLength(4);

    let accessResult!: Promise<unknown>;
    before = counts();
    await readers.access.hook.act(() => {
      accessResult = Promise.resolve(
        store.set(settings.storage, { type: "test-access" }),
      );
    });
    expect(readers.access.hook.result.current).toEqual({ status: "testing" });
    expect(delta(before)).toEqual({
      profiles: 0,
      raw: 0,
      validation: 0,
      access: 1,
      upload: 0,
      gallery: 0,
      catalog: 0,
    });
    expect(persistence.setCalls).toHaveLength(4);
    expect(imageStorage.calls.createStorage).toHaveLength(1);
    expect(imageStorage.calls.checkAccess).toEqual([
      { origin: "https://app.example.com" },
    ]);

    before = counts();
    access.resolve({ ok: true, value: { allowedMethods: ["GET"] } });
    await readers.access.hook.act(async () => {
      await accessResult;
    });
    expect(readers.access.hook.result.current).toEqual({
      status: "success",
      allowedMethods: ["GET"],
    });
    expect(delta(before)).toEqual({
      profiles: 0,
      raw: 0,
      validation: 0,
      access: 1,
      upload: 0,
      gallery: 0,
      catalog: 0,
    });
    expect(persistence.setCalls).toHaveLength(4);

    before = counts();
    await readers.catalog.hook.act(() => {
      store.set(imageCatalog.view.selection, {
        type: "toggle",
        key: "i/catalog-only.webp",
        checked: true,
        shift: false,
      });
    });
    expect(delta(before)).toEqual({
      profiles: 0,
      raw: 0,
      validation: 0,
      access: 0,
      upload: 0,
      gallery: 0,
      catalog: 1,
    });
    expect(persistence.setCalls).toHaveLength(4);

    before = counts();
    await readers.gallery.hook.act(() => {
      store.set(settings.gallery, structuredClone(store.get(settings.gallery)));
    });
    expect(delta(before)).toEqual({
      profiles: 0,
      raw: 0,
      validation: 0,
      access: 0,
      upload: 0,
      gallery: 0,
      catalog: 0,
    });
    expect(persistence.setCalls).toHaveLength(4);

    const settled = counts();
    await settle();
    expect(counts()).toEqual(settled);
  });
});
