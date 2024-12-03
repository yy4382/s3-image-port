import imageCompression from "browser-image-compression";
import mime from "mime";
import type { ConvertSettings } from "~/types";

export default async function (
  file: File,
  options: ConvertSettings,
): Promise<File> {
  if (options.convertType === "none") {
    return file;
  }

  const fileType = mime.getType(options.convertType) || "image/jpeg";
  const compressedFile = await imageCompression(file, {
    maxSizeMB: options.compressionMaxSize || undefined,
    maxWidthOrHeight: options.compressionMaxWidthOrHeight || undefined,
    useWebWorker: true,
    fileType,
  });
  // console.log(
  //   `File compressed from ${file.size} to ${compressedFile.size},\n` +
  //   `from ${file.type} to ${compressedFile.type}`
  // );
  return compressedFile;
}
