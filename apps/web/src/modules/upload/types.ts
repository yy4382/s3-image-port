import type { S3KeyMetadata } from "@/lib/s3/s3-key";
import type { CompressOption } from "@/lib/utils/imageCompress";

export type PendingUpload = {
  file: File;
  processedFile: File | null;
  key: S3KeyMetadata;
  compressOption: CompressOption | null;
  status: "pending" | "processing" | "processed" | "uploading" | "uploaded";
  id: string;
  supportProcess: boolean;
};
