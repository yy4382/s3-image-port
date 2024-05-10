import { appSettingsSchema, s3SettingsSchema } from "~/types";

export const useValidSettings = () => {
  const { s3Settings, appSettings } = useSettings();
  const validAppSetting = computed(() =>
    appSettingsSchema.safeParse(appSettings.value).success
  );
  const validS3Setting = computed(() =>
    s3SettingsSchema.safeParse(s3Settings.value).success
  );
  return { s3Settings, appSettings, validAppSetting, validS3Setting };
}
