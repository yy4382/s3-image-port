export function useImageMime(key: MaybeRefOrGetter<string>): {
  mimeType: Ref<string | null>;
  refresh: () => Promise<void>;
} {
  const settings = useSettingsStore();

  const mimeType = ref<string | null>(null);

  const mimeCache = useLocalStorage<Record<string, string>>(
    "s3ip:mimeCache",
    {},
  );

  const load = async (key: string) => {
    let mime = mimeCache.value[key];
    if (!mime || mime === "unknown") {
      const resp = await new ImageS3Client(settings.s3).head(key);
      mime = resp.ContentType ?? "unknown";
      mimeCache.value[key] = mime;
    }
    return {
      mimeType: mime,
    };
  };

  const update = async () => {
    const { mimeType: localMimeType } = await load(toValue(key));
    mimeType.value = localMimeType;
  };
  onMounted(async () => {
    watchEffect(update);
  });

  const refresh = async () => {
    if (toValue(key) in mimeCache.value) {
      // eslint-disable-next-line @typescript-eslint/no-dynamic-delete
      delete mimeCache.value[toValue(key)];
    }
    await update();
  };
  return { mimeType, refresh };
}
