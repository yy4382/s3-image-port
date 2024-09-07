// @vitest-environment nuxt
import { describe, test, expect, beforeEach, afterEach } from "vitest";
import { setActivePinia, createPinia } from "pinia";

// MARK: Settings Store
describe("Settings Store", async () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    initLocalStorage();
  });

  afterEach(() => {});

  test("should read from localStorage", async () => {
    const settingsStore = useSettingsStore();
    expect(settingsStore.s3.region).toBe("auto");
    expect(settingsStore.s3.endpoint).toBe("https://example.com");
    expect(settingsStore.app.fuzzySearchThreshold).toBe(0.8);
  });

  test("should use default values if localStorage is empty", async () => {
    localStorage.removeItem("app-settings");
    expect(useSettingsStore().app.fuzzySearchThreshold).toBe(0.6);
  });

  test("should validate settings", async () => {
    const settingsStore = useSettingsStore();
    expect(settingsStore.validity.all).toBe(true);
    settingsStore.s3.endpoint = "abc";
    expect(settingsStore.validity.all).toBe(false);
    expect(settingsStore.validity.s3).toBe(false);
  });
});

// MARK: Utils
const initLocalStorage = () => {
  localStorage.setItem(
    "s3-settings",
    JSON.stringify({
      endpoint: "https://example.com",
      bucket: "image-test",
      accKeyId: "asdf",
      secretAccKey: "asdf",
      region: "auto",
      pubUrl: "https://public.example.com/",
    }),
  );
  localStorage.setItem(
    "app-settings",
    JSON.stringify({
      enableAutoRefresh: false,
      enableFuzzySearch: true,
      fuzzySearchThreshold: 0.8,
      convertType: "none",
      compressionMaxSize: "",
      compressionMaxWidthOrHeight: "",
      keyTemplate: "",
      noLongerShowRootPage: false,
    }),
  );
};
