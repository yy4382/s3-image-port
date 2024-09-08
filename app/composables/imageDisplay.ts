export function useImageDisplay<T extends "get" | "head">(
  key: MaybeRefOrGetter<string>,
  options: {
    loadMethod: T;
  },
): {
  imageData: T extends "get" ? Ref<Blob | null> : Ref<string | null>;
  isImage: Ref<boolean | null>;
  mimeType: Ref<string | null>;
  refresh: () => Promise<void>;
} {
  const settings = useSettingsStore();

  const imageData = shallowRef<Blob | string | null>(null);
  const isImage = ref<boolean | null>(null);
  const mimeType = ref<string | null>(null);

  const mimeCache = useLocalStorage<Record<string, string>>(
    "s3ip:mimeCache",
    {},
  );

  const load = async (key: string) => {
    switch (options.loadMethod) {
      case "get": {
        const resp = await new ImageS3Client(settings.s3).get(key);
        return {
          data: await streamToBlob(resp.Body as ReadableStream),
          mimeType: resp.ContentType ?? "unknown",
        };
      }
      case "head": {
        let mime = mimeCache.value[key];
        if (!mime) {
          const resp = await new ImageS3Client(settings.s3).head(key);
          mime = resp.ContentType ?? "unknown";
          mimeCache.value[key] = mime;
        }
        return {
          data: key2Url(key, settings.s3),
          mimeType: mime,
        };
      }
      default:
        throw new Error("Unknown load method");
    }
  };
  const update = async () => {
    const { data, mimeType: localMimeType } = await load(toValue(key));
    imageData.value = data;
    mimeType.value = localMimeType;
    isImage.value = localMimeType.startsWith("image/") ?? null;
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
  // @ts-expect-error extended type
  return { imageData, isImage, mimeType, refresh };
}

async function streamToBlob(stream: ReadableStream) {
  const reader = stream.getReader();
  const chunks = [];

  // eslint-disable-next-line no-constant-condition
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(value);
  }

  return new Blob(chunks);
}
