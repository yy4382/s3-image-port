import mime from "mime";
import * as z from "zod/v4";

export const compressOptionSchema = z.union([
  z.object({
    type: z.literal("avif"),
    quality: z.number().min(0).max(100),
  }),
  z.object({
    type: z.literal("jpeg"),
    quality: z.number().min(0).max(100),
  }),
  z.object({
    type: z.literal("webp"),
    quality: z.number().min(0).max(100),
  }),
  z.object({
    type: z.literal("png"),
  }),
]);

export type CompressOption = z.infer<typeof compressOptionSchema>;

type OutputTypes = CompressOption["type"];

const SUPPORTED_INPUT_MIME = {
  "image/avif": "avif",
  "image/jpg": "jpeg",
  "image/jpeg": "jpeg",
  "image/webp": "webp",
  "image/png": "png",
} as const;

const wasmInitialized = new Map<OutputTypes, boolean>();
async function ensureWasmLoaded(format: OutputTypes): Promise<void> {
  if (wasmInitialized.get(format)) return;

  try {
    switch (format) {
      case "avif":
        await import("@jsquash/avif");
        break;
      case "jpeg":
        await import("@jsquash/jpeg");
        break;
      case "png":
        await import("@jsquash/png");
        break;
      case "webp":
        await import("@jsquash/webp");
        break;
    }
    wasmInitialized.set(format, true);
  } catch (error) {
    console.error(`Failed to initialize WASM for ${format}:`, error);
    throw new Error(`Failed to initialize ${format} support`);
  }
}

export async function decode(
  sourceMime: keyof typeof SUPPORTED_INPUT_MIME,
  fileBuffer: ArrayBuffer,
): Promise<ImageData> {
  const sourceType = SUPPORTED_INPUT_MIME[sourceMime];
  // Ensure WASM is loaded for the source type
  await ensureWasmLoaded(sourceType);

  try {
    switch (sourceType) {
      case "avif": {
        const { decode } = await import("@jsquash/avif");
        return await decode(fileBuffer);
      }
      case "jpeg": {
        const { decode } = await import("@jsquash/jpeg");
        return await decode(fileBuffer);
      }
      // case "jxl":
      // return await jxl.decode(fileBuffer);
      case "png": {
        const { decode } = await import("@jsquash/png");
        return await decode(fileBuffer);
      }
      case "webp": {
        const { decode } = await import("@jsquash/webp");
        return await decode(fileBuffer);
      }
      default:
        throw new Error(`Unsupported source type: ${sourceMime}`);
    }
  } catch (error) {
    console.error(`Failed to decode ${sourceMime} image:`, error);
    throw new Error(`Failed to decode ${sourceMime} image`);
  }
}

export async function encode(
  option: CompressOption,
  imageData: ImageData,
): Promise<ArrayBuffer> {
  // Ensure WASM is loaded for the output type
  await ensureWasmLoaded(option.type);

  try {
    switch (option.type) {
      case "avif": {
        const { encode } = await import("@jsquash/avif");
        return await encode(imageData, option);
      }
      case "jpeg": {
        const { encode } = await import("@jsquash/jpeg");
        return await encode(imageData, option);
      }
      case "png": {
        const { encode } = await import("@jsquash/png");
        return await encode(imageData);
      }
      case "webp": {
        const { encode } = await import("@jsquash/webp");
        return await encode(imageData, option);
      }
    }
  } catch (error) {
    console.error(`Failed to encode to ${option.type}:`, error);
    throw new Error(`Failed to encode to ${option.type}`);
  }
}

export function isSupportedFileType(file: File): boolean {
  return Object.keys(SUPPORTED_INPUT_MIME).includes(file.type);
}

export async function processFile(
  file: File,
  option: CompressOption,
  unSupportedCb: () => void,
): Promise<File> {
  if (!Object.keys(SUPPORTED_INPUT_MIME).includes(file.type)) {
    unSupportedCb();
    return file;
  }
  const sourceMime = file.type as keyof typeof SUPPORTED_INPUT_MIME;
  const outputMime = mime.getType(option.type);

  const fileBuffer = await file.arrayBuffer();
  const imageData = await decode(sourceMime, fileBuffer);
  const encodedBuffer = await encode(option, imageData);

  return new File([encodedBuffer], file.name, {
    type: outputMime ?? undefined,
    lastModified: file.lastModified,
  });
}

export function formatFileSize(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
}
