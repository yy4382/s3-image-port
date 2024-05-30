import type { AppSettings, S3Settings } from "~/types";
import { appSettingsSchema, s3SettingsSchema } from "~/types";
import * as checkOp from "~/utils/testOps";

export const useSettingsStore = defineStore("settings", () => {
  // MARK: states
  const s3Settings = useLocalStorage("s3-settings", {
    endpoint: "",
    bucket: "",
    accKeyId: "",
    secretAccKey: "",
    region: "",
    pubUrl: "",
  } satisfies S3Settings as S3Settings);
  const appSettings = useLocalStorage("app-settings", {
    enableAutoRefresh: false,
    enableFuzzySearch: true,
    fuzzySearchThreshold: 0.6,
    convertType: "none",
    compressionMaxSize: "",
    compressionMaxWidthOrHeight: "",
    keyTemplate: "",
  } satisfies AppSettings as AppSettings);

  const validAppSetting = computed(
    () => appSettingsSchema.safeParse(appSettings.value).success,
  );
  const validS3Setting = computed(
    () => s3SettingsSchema.safeParse(s3Settings.value).success,
  );

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
      while ((await checkOp.exists(s3Settings.value, testKey)) && limit-- > 0) {
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

    const upload = await checkOp.upload(s3Settings.value, testKey, testContent);
    const list = await checkOp.list(s3Settings.value);
    const del = await checkOp.delete(s3Settings.value, testKey);
    return {
      get: true,
      upload,
      list,
      delete: del,
    };
  };

  const list = (onlyOnce: boolean) => {
    listObj(s3Settings.value, onlyOnce);
  };

  const del = (key: string) => {
    deleteObj(key, s3Settings.value);
  };

  const upload = (file: string | Blob | Buffer, key: string) => {
    uploadObj(file, key, s3Settings.value);
  };

  return {
    s3Settings,
    appSettings,
    validAppSetting,
    validS3Setting,

    test,
    list,
    del,
    upload,
  };
});

if (import.meta.hot) {
  import.meta.hot.accept(acceptHMRUpdate(useSettingsStore, import.meta.hot));
}
