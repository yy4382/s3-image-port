import type { S3KeyMetadata } from "@/lib/s3/s3-key";
import type { CompressOption } from "@/lib/utils/imageCompress";
import type { ImageStorageFailure } from "@/modules/image-storage";

export type PendingUploadStatus =
  | "pending"
  | "processing"
  | "processed"
  | "uploading"
  | "uploaded";

export type PendingUploadResult =
  | { success: true }
  | { success: false; error: ImageStorageFailure["reason"] };

export type PendingUpload = {
  file: File;
  processedFile: File | null;
  key: S3KeyMetadata;
  compressOption: CompressOption | null;
  status: PendingUploadStatus;
  id: string;
  supportProcess: boolean;
};
