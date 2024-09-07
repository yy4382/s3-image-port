export const useImageDisplay = (key: MaybeRefOrGetter<string>) => {
  const settings = useSettingsStore();

  const imageBlob = shallowRef<Blob | null>(null);
  const isImage = ref<boolean | null>(null);
  onMounted(async () => {
    watchEffect(async () => {
      const resp = await new ImageS3Client(settings.s3).get(toValue(key));
      imageBlob.value = await streamToBlob(resp.Body as ReadableStream);
      isImage.value = resp.ContentType?.startsWith("image/") ?? null;
    });
  });
  return { imageBlob, isImage };
};

async function streamToBlob(stream: ReadableStream) {
  const reader = stream.getReader();
  const chunks = [];

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(value);
  }

  return new Blob(chunks);
}
