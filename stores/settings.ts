import { skipHydrate } from "pinia";
import type { AppSettings, S3Settings } from "~/types";
import { appSettingsSchema, s3SettingsSchema } from "~/types";
import * as checkOp from "~/utils/testOps";
import key2UrlUtil from "~/utils/key2Url";

export const useSettingsStore = defineStore("settings", () => {
  // MARK: states
  const s3 = useLocalStorage("s3-settings", {
    endpoint: "",
    bucket: "",
    accKeyId: "",
    secretAccKey: "",
    region: "",
    pubUrl: "",
  } satisfies S3Settings as S3Settings);
  const app = useLocalStorage("app-settings", {
    enableAutoRefresh: false,
    enableFuzzySearch: true,
    fuzzySearchThreshold: 0.6,
    convertType: "none",
    compressionMaxSize: "",
    compressionMaxWidthOrHeight: "",
    keyTemplate: "",
  } satisfies AppSettings as AppSettings);

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

  const list = (onlyOnce?: boolean) => {
    return listObj(s3.value, onlyOnce);
  };

  const del = (key: string) => {
    return deleteObj(key, s3.value);
  };

  const upload = (file: File | string, key: string) => {
    return uploadObj(file, key, s3.value);
  };

  const key2Url = (key: string) => {
    return key2UrlUtil(key, s3.value);
  };

  return {
    s3: skipHydrate(s3),
    app: skipHydrate(app),
    validity: skipHydrate(validity),

    test,
    list,
    del,
    upload,
    key2Url,
  };
});

if (import.meta.hot) {
  import.meta.hot.accept(acceptHMRUpdate(useSettingsStore, import.meta.hot));
}
