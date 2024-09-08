export const useImageDisplay = (key: MaybeRefOrGetter<string>) => {
  const settings = useSettingsStore();

  const imageBlob = shallowRef<Blob | null>(null);
  const isImage = ref<boolean | null>(null);
  const mimeType = ref<string | null>(null);
  onMounted(async () => {
    watchEffect(async () => {
      const resp = await new ImageS3Client(settings.s3).get(toValue(key));
      imageBlob.value = await streamToBlob(resp.Body as ReadableStream);
      mimeType.value = resp.ContentType ?? "unknown";
      isImage.value = mimeType.value.startsWith("image/") ?? null;
    });
  });
  return { imageBlob, isImage, mimeType };
};

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
