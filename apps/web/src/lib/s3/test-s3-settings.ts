import type { S3Options } from "@/stores/schemas/settings";
import {
  createS3ImageStorage,
  type CreateImageStorageFromSettings,
} from "@/modules/image-storage";

export async function getAllowedMethods(
  settings: S3Options,
  currentOrigin: string,
  createStorage: CreateImageStorageFromSettings = createS3ImageStorage,
) {
  const result = await createStorage(settings).checkAccess({
    origin: currentOrigin,
  });
  if (result.ok) {
    return result.value.allowedMethods;
  }
  if (result.error.reason === "cors-incomplete") {
    return result.error.allowedMethods;
  }
  return null;
}

export async function testS3Settings(
  settings: S3Options,
  currentOrigin: string,
  createStorage: CreateImageStorageFromSettings = createS3ImageStorage,
) {
  const result = await createStorage(settings).checkAccess({
    origin: currentOrigin,
  });

  if (result.ok) {
    return {
      valid: true,
      allowedMethods: result.value.allowedMethods,
    } as const;
  }

  if (result.error.reason === "cors-incomplete") {
    return {
      valid: false,
      type: "no-allowed-methods",
      allowedMethods: result.error.allowedMethods,
      missingMethods: result.error.missingMethods,
    } as const;
  }

  return {
    valid: false,
    type: "no-result",
  } as const;
}
