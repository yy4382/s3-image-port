import { appSettingsSchema, s3ConfigSchema } from "~/types";

export const useValidSettings = () => {
  const { s3Settings, appSettings } = useSettings();
  const validAppSetting = computed(() =>
    appSettingsSchema.safeParse(appSettings.value).success
  );
  const validS3Setting = computed(() =>
    s3ConfigSchema.safeParse(s3Settings.value).success
  );
  return { s3Settings, appSettings, validAppSetting, validS3Setting };
}
