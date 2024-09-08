/**
 * Displays a toast notification for invalid settings.
 * Notice: Needs to be used on client-side, such as in onMounted hooks.
 * @param type - The type of setting. "app", "s3", or undefined (show both).
 */
export const useWrongSettingToast = (type: "app" | "s3" | undefined) => {
  const toast = useToast();
  const { t } = useI18n();
  const localePath = useLocalePath();

  if (!type || type === "s3") {
    toast.add({
      title: t("general.message.invalidS3Setting.title"),
      description: t("general.message.invalidS3Setting.description"),
      actions: [
        {
          label: t("general.actions.goToSettings"),
          click: () => navigateTo(localePath("/settings/s3")),
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
          click: () => navigateTo(localePath("/settings")),
        },
      ],
      color: "red",
      icon: "i-mingcute-warning-line",
      timeout: 0,
    });
  }
};
