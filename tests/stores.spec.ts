// @vitest-environment nuxt
import {
  describe,
  test,
  expect,
  beforeEach,
  vi,
  afterEach,
  beforeAll,
  afterAll,
} from "vitest";
import { setActivePinia, createPinia } from "pinia";
// @ts-expect-error - no types available
import { Blob, File } from "blob-polyfill";
import { readFileSync } from "fs";
import path from "path";
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

  test("should generate correct URLs", async () => {
    const settingsStore = useSettingsStore();
    expect(settingsStore.key2Url("a/b/c.jpg")).toBe(
      "https://public.example.com/a/b/c.jpg",
    );
    settingsStore.s3.pubUrl = "";
    expect(settingsStore.key2Url("a/b/c.jpg")).toBe(
      "https://example.com/image-test/a/b/c.jpg",
    );
  });
});

// MARK: Upload Store
describe("Upload Store", async () => {
  beforeAll(() => {
    Math.random = vi.fn(() => 0.5);
  });
  beforeEach(() => {
    setActivePinia(createPinia());
    initLocalStorage();
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.clearAllTimers();
    vi.useRealTimers();
  });
  afterAll(() => {
    vi.resetAllMocks();
  });
  test("should correctly add, remove files and reset", async () => {
    let mockDate = new Date(2021, 1, 1, 2, 3, 1, 3);
    vi.setSystemTime(mockDate);
    const uploadStore = useUploadStore();
    const file1 = createFileFromImage("tests/assets/ava.png");
    const file2 = createFileFromImage("tests/assets/logo_副本.png");

    uploadStore.push([file1]);
    expect(uploadStore.files.length).toBe(1);

    mockDate = new Date(2021, 1, 1, 2, 3, 3, 4);
    vi.setSystemTime(mockDate);

    uploadStore.push([file1, file2]);
    expect(uploadStore.files.length).toBe(2);

    expect(uploadStore.keys[0]).toBe("i/2021/02/01/4e77v-i.png");
    expect(uploadStore.keys[1]).toBe("i/2021/02/01/4e8rg-i.png");
    expect(uploadStore.configs[0].convertType).toBe("none");

    uploadStore.remove(0);
    expect(uploadStore.files.length).toBe(1);
    expect(uploadStore.keys.length).toBe(1);
    expect(uploadStore.configs.length).toBe(1);
    expect(uploadStore.length).toBe(1);
    expect(uploadStore.keys[0]).toBe("i/2021/02/01/4e8rg-i.png");

    uploadStore.reset();
    expect(uploadStore.files.length).toBe(0);
    expect(uploadStore.keys.length).toBe(0);
    expect(uploadStore.configs.length).toBe(0);
    expect(uploadStore.length).toBe(0);
  });

  test("should keysAreDifferent return correct value", async () => {
    const mockDate = new Date(2021, 1, 1, 2, 3, 1, 3);
    vi.setSystemTime(mockDate);
    const uploadStore = useUploadStore();
    uploadStore.push([
      createFileFromImage("tests/assets/ava.png"),
      createFileFromImage("tests/assets/logo_副本.png"),
    ]);
    expect(uploadStore.keysAreDifferent).toBe(false);
    uploadStore.remove(0);
    expect(uploadStore.keysAreDifferent).toBe(true);
  });
  test("should react to self config change", async () => {
    const uploadStore = useUploadStore();
    for (let i = 0; i < 4; i++) {
      vi.setSystemTime(new Date(2021, 1, 1, 2, 3, 1, i));
      uploadStore.push([
        createSimpleFile(i + ".jpg", "a".repeat(i), "image/jpeg"),
      ]);
    }
    expect(uploadStore.keysAreDifferent).toBe(true);
    expect(uploadStore.keys).toEqual([
      "i/2021/02/01/4e77s-i.jpg",
      "i/2021/02/01/4e77t-i.jpg",
      "i/2021/02/01/4e77u-i.jpg",
      "i/2021/02/01/4e77v-i.jpg",
    ]);

    await nextTick(); // wait watcher's old value to be set

    uploadStore.configs[0].keyTemplate = "a";
    await nextTick();
    expect(uploadStore.keys).toEqual([
      "a",
      "i/2021/02/01/4e77t-i.jpg",
      "i/2021/02/01/4e77u-i.jpg",
      "i/2021/02/01/4e77v-i.jpg",
    ]);

    uploadStore.configs[1].keyTemplate = "{{year}}";
    await nextTick();
    expect(uploadStore.keys).toEqual([
      "a",
      "2021",
      "i/2021/02/01/4e77u-i.jpg",
      "i/2021/02/01/4e77v-i.jpg",
    ]);

    vi.setSystemTime(new Date(2021, 1, 1, 2, 3, 1, 2));
    uploadStore.configs[2].convertType = "webp";
    await nextTick();
    expect(uploadStore.keys).toEqual([
      "a",
      "2021",
      "i/2021/02/01/4e77u-i.webp",
      "i/2021/02/01/4e77v-i.jpg",
    ]);

    uploadStore.configs[3].convertType = "webp";
    uploadStore.configs[3].keyTemplate = "a.{{ext}}";
    await nextTick();
    expect(uploadStore.keys).toEqual([
      "a",
      "2021",
      "i/2021/02/01/4e77u-i.webp",
      "a.webp",
    ]);
  });
  test("should react to global config change", async () => {
    const settingsStore = useSettingsStore();
    const uploadStore = useUploadStore();
    for (let i = 0; i < 4; i++) {
      vi.setSystemTime(new Date(2021, 1, 1, 2, 3, 1, i));
      uploadStore.push([
        createSimpleFile(i + ".jpg", "a".repeat(i), "image/jpeg"),
      ]);
    }
    expect(uploadStore.keysAreDifferent).toBe(true);
    expect(uploadStore.keys).toEqual([
      "i/2021/02/01/4e77s-i.jpg",
      "i/2021/02/01/4e77t-i.jpg",
      "i/2021/02/01/4e77u-i.jpg",
      "i/2021/02/01/4e77v-i.jpg",
    ]);

    await nextTick(); // wait watcher's old value to be set

    uploadStore.configs[0].keyTemplate = "a";
    uploadStore.configs[1].compressionMaxSize = 10;
    uploadStore.configs[2].convertType = "webp";
    uploadStore.configs[3].keyTemplate = "a.{{ext}}";

    await nextTick();

    expect(uploadStore.keys).toEqual([
      "a",
      "i/2021/02/01/4e77t-i.jpg",
      "i/2021/02/01/4e77v-i.webp", // 77u->77v because system time mock is updated
      "a.jpg",
    ]);
    expect(uploadStore.configs).toEqual([
      {
        convertType: "none",
        compressionMaxSize: "",
        compressionMaxWidthOrHeight: "",
        keyTemplate: "a",
      },
      {
        convertType: "none",
        compressionMaxSize: 10,
        compressionMaxWidthOrHeight: "",
        keyTemplate: "",
      },
      {
        convertType: "webp",
        compressionMaxSize: "",
        compressionMaxWidthOrHeight: "",
        keyTemplate: "",
      },
      {
        convertType: "none",
        compressionMaxSize: "",
        compressionMaxWidthOrHeight: "",
        keyTemplate: "a.{{ext}}",
      },
    ]);
    settingsStore.app.keyTemplate = "b.{{ext}}";
    settingsStore.app.convertType = "jpg";
    settingsStore.app.compressionMaxSize = 40;
    await nextTick();
    expect(uploadStore.keys).toEqual(["a", "b.jpg", "b.webp", "a.jpg"]);
    expect(uploadStore.configs).toEqual([
      {
        convertType: "jpg",
        compressionMaxSize: 40,
        compressionMaxWidthOrHeight: "",
        keyTemplate: "a",
      },
      {
        convertType: "none",
        compressionMaxSize: 10,
        compressionMaxWidthOrHeight: "",
        keyTemplate: "b.{{ext}}",
      },
      {
        convertType: "webp",
        compressionMaxSize: "",
        compressionMaxWidthOrHeight: "",
        keyTemplate: "b.{{ext}}",
      },
      {
        convertType: "jpg",
        compressionMaxSize: 40,
        compressionMaxWidthOrHeight: "",
        keyTemplate: "a.{{ext}}",
      },
    ]);
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
    }),
  );
};

function createFileFromImage(filePath: string): File {
  // Resolve the full path to the image file
  const fullPath = path.resolve(filePath);
  // Read the binary content of the file
  const fileBuffer = readFileSync(fullPath);
  // Create a Blob from the file buffer
  const blob = new Blob([fileBuffer]);
  // Create a File object from the Blob
  const file = new File([blob], path.basename(filePath), {
    type: "image/jpeg",
  }); // Adjust mime type if necessary
  return file;
}

function createSimpleFile(name: string, content: string, mime: string): File {
  return new File([content], name, { type: mime });
}
