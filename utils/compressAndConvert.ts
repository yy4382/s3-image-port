import imageCompression from "browser-image-compression";
import mime from "mime";

export default async function (file: File): Promise<File> {
  const { app: appSettings } = useSettingsStore();
  const fileType =
    appSettings.convertType === "none"
      ? file.type
      : mime.getType(appSettings.convertType) || "image/jpeg";

  const compressedFile = await imageCompression(file, {
    maxSizeMB: appSettings.compressionMaxSize || undefined,
    maxWidthOrHeight: appSettings.compressionMaxWidthOrHeight || undefined,
    useWebWorker: true,
    fileType,
  });
  // console.log(
  //   `File compressed from ${file.size} to ${compressedFile.size},\n` +
  //   `from ${file.type} to ${compressedFile.type}`
  // );
  return compressedFile;
}
