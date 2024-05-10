import { useStorage } from "@vueuse/core"
import type { AppSettings, S3Config } from "~/types";
import { appSettingsSchema, s3ConfigSchema } from "~/types";
export const useSettings = () => {
  const appSettings = useStorage("app-settings", {
    convertType: "none",
    compressionMaxSize: "",
    compressionMaxWidthOrHeight: "",
    keyTemplate: "",
  } satisfies AppSettings as AppSettings);
  const { success: validAppSetting } = appSettingsSchema.safeParse(appSettings.value);

  const s3Settings = useStorage("s3-settings", {
    endpoint: "",
    bucket: "",
    accKeyId: "",
    secretAccKey: "",
    region: "",
    pubUrl: "",
  } satisfies S3Config as S3Config);
  const { success: validS3Setting } = s3ConfigSchema.safeParse(s3Settings.value);

  return { appSettings, s3Settings, validAppSetting, validS3Setting };
}
