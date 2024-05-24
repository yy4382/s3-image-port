import imageCompression from "browser-image-compression";

export default async function (file: File): Promise<File> {
  const { appSettings } = useValidSettings();
  let fileType = file.type;
  switch (appSettings.value.convertType) {
    case "none":
      break;
    case "webp":
      fileType = "image/webp";
      break;
    case "jpg":
      fileType = "image/jpeg";
      break;
  }
  const compressedFile = await imageCompression(file, {
    maxSizeMB: appSettings.value.compressionMaxSize || undefined,
    maxWidthOrHeight:
      appSettings.value.compressionMaxWidthOrHeight || undefined,
    useWebWorker: true,
    fileType,
  });
  // console.log(
  //   `File compressed from ${file.size} to ${compressedFile.size},\n` +
  //   `from ${file.type} to ${compressedFile.type}`
  // );
  return compressedFile;
}
