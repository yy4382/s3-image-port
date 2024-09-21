import { skipHydrate } from "pinia";
import type { AppSettings, S3Settings } from "~/types";
import { appSettingsSchema, s3SettingsSchema } from "~/types";
import * as checkOp from "~/utils/testOps";

export const useSettingsStore = defineStore("settings", () => {
  // MARK: states
  const s3 = useLocalStorage(
    "s3-settings",
    {
      endpoint: "",
      bucket: "",
      accKeyId: "",
      secretAccKey: "",
      region: "",
      pubUrl: "",
      forcePathStyle: false,
    } satisfies S3Settings as S3Settings,
    { mergeDefaults: true },
  );
  const app = useLocalStorage(
    "app-settings",
    {
      enableAutoRefresh: false,
      enableFuzzySearch: true,
      fuzzySearchThreshold: 0.6,
      convertType: "none",
      compressionMaxSize: "",
      compressionMaxWidthOrHeight: "",
      keyTemplate: "",
      noLongerShowRootPage: false,
    } satisfies AppSettings as AppSettings,
    { mergeDefaults: true },
  );

  const validity = computed(() => ({
    app: appSettingsSchema.safeParse(app.value).success,
    s3: s3SettingsSchema.safeParse(s3.value).success,
    all:
      appSettingsSchema.safeParse(app.value).success &&
      s3SettingsSchema.safeParse(s3.value).success,
  }));

  //MARK: actions

  const test: () => Promise<{
    get: boolean;
    list: boolean;
    delete: boolean;
    upload: boolean;
  }> = async () => {
    debug("Start testing S3 connectivity...");
    let { testKey, testContent } = generateTestKeyAndContent();
    debug("Generated test key and content:", testKey, testContent);
    try {
      let limit = 3;
      while ((await checkOp.exists(s3.value, testKey)) && limit-- > 0) {
        debug("Object already exists, generating new test key and content...");
        ({ testKey, testContent } = generateTestKeyAndContent());
      }
    } catch (e) {
      console.error("Error occurred while checking if object exists:", e);
      return {
        get: false,
        list: false,
        delete: false,
        upload: false,
      };
    }
    debug("Unique test key and content generated.");

    const upload = await checkOp.upload(s3.value, testKey, testContent);
    const list = await checkOp.list(s3.value);
    const del = await checkOp.del(s3.value, testKey);
    return {
      get: true,
      upload,
      list,
      delete: del,
    };
  };

  const exportSettings = () => {
    return {
      s3: s3.value,
      app: app.value,
    };
  };

  const importSettings = (settings: { s3: S3Settings; app: AppSettings }) => {
    const { success: appSuccess, data: appData } = appSettingsSchema.safeParse(
      settings.app,
    );
    const { success: s3Success, data: s3Data } = s3SettingsSchema.safeParse(
      settings.s3,
    );
    if (!appSuccess || !s3Success) {
      throw new Error("Invalid settings format");
    }
    app.value = appData;
    s3.value = s3Data;
  };

  return {
    s3: skipHydrate(s3),
    app: skipHydrate(app),
    validity: skipHydrate(validity),

    test,
    exportSettings,
    importSettings,
  };
});

if (import.meta.hot) {
  import.meta.hot.accept(acceptHMRUpdate(useSettingsStore, import.meta.hot));
}
