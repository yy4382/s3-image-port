export const useWrongSettingToast = (type: "app" | "s3" | undefined) => {
  const toast = useToast();
  const { t } = useI18n();
  const localePath = useLocalePath();
  const router = useRouter();

  if (!type || type === "s3") {
    toast.add({
      title: t("general.message.invalidS3Setting.title"),
      description: t("general.message.invalidS3Setting.description"),
      actions: [
        {
          label: t("general.actions.goToSettings"),
          click: () => router.push(localePath("/settings")),
        },
      ],
      color: "red",
      icon: "i-mingcute-warning-line",
      timeout: 0,
    });
  }

  if (!type || type === "app") {
    toast.add({
      title: t("general.message.invalidAppSetting.title"),
      description: t("general.message.invalidAppSetting.description"),
      actions: [
        {
          label: t("general.actions.goToSettings"),
          click: () => router.push(localePath("/settings")),
        },
      ],
      color: "red",
      icon: "i-mingcute-warning-line",
      timeout: 0,
    });
  }
}
