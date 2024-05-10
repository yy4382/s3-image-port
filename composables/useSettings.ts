import { useStorage } from "@vueuse/core"
import type { AppSettings, S3Settings } from "~/types";
export const useSettings = () => {
  const appSettings = useStorage("app-settings", {
    convertType: "none",
    compressionMaxSize: "",
    compressionMaxWidthOrHeight: "",
    keyTemplate: "",
  } satisfies AppSettings as AppSettings);

  const s3Settings = useStorage("s3-settings", {
    endpoint: "",
    bucket: "",
    accKeyId: "",
    secretAccKey: "",
    region: "",
    pubUrl: "",
  } satisfies S3Settings as S3Settings);

  return { appSettings, s3Settings };
}
