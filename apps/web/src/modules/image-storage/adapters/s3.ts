import ImageS3Client, {
  type ListedS3ImageObject,
} from "./image-s3-client";
import { s3Key2Url } from "@/lib/s3/s3-key";
import type { S3Options } from "@/stores/schemas/settings";
import type {
  ImageStorageFailure,
  StorageAccessMethod,
  StoredImage,
} from "../schema";
import {
  requiredStorageAccessMethods,
  storageAccessMethodSchema,
} from "../schema";
import {
  createImageStorage,
  type ImageStorage,
  type ImageStorageAdapter,
} from "../storage";

export type CreateImageStorageFromSettings = (
  settings: S3Options,
) => ImageStorage;

export function createS3ImageStorage(settings: S3Options): ImageStorage {
  return createImageStorage(createS3ImageStorageAdapter(settings));
}

export function createS3ImageStorageAdapter(
  settings: S3Options,
): ImageStorageAdapter {
  const client = new ImageS3Client(settings);

  return {
    async listStoredImages() {
      try {
        const listedImages = await client.list();
        return {
          ok: true,
          value: listedImages.map((image) => toStoredImage(image, settings)),
        };
      } catch (error) {
        return {
          ok: false,
          error: toStorageFailure(error),
        };
      }
    },
    async putStoredImage(input) {
      try {
        await client.upload(input.body, input.key);
        return {
          ok: true,
          value: {
            key: input.key,
            url: s3Key2Url(input.key, settings),
          },
        };
      } catch (error) {
        return {
          ok: false,
          error: toStorageFailure(error, input.key),
        };
      }
    },
    async deleteStoredImages(keys) {
      try {
        const results = await Promise.all(
          keys.map(async (key) => {
            try {
              await client.delete(key);
              return { ok: true as const };
            } catch (error) {
              return {
                ok: false as const,
                error: toStorageFailure(error, key),
              };
            }
          }),
        );
        for (const result of results) {
          if (!result.ok) {
            return {
              ok: false,
              error: result.error,
            };
          }
        }
        return {
          ok: true,
          value: {
            deletedKeys: [...keys],
          },
        };
      } catch (error) {
        return {
          ok: false,
          error: toStorageFailure(error),
        };
      }
    },
    async renameStoredImage(input) {
      try {
        await client.rename(input.oldKey, input.newKey, input.overwrite);
        return {
          ok: true,
          value: {
            oldKey: input.oldKey,
            newKey: input.newKey,
          },
        };
      } catch (error) {
        if (isAlreadyExistsError(error)) {
          return {
            ok: false,
            error: { reason: "already-exists", key: input.newKey },
          };
        }
        if (isPartialRenameError(error)) {
          return {
            ok: false,
            error: {
              reason: "partial-rename",
              copiedKey: input.newKey,
              failedDeleteKey: input.oldKey,
            },
          };
        }
        return {
          ok: false,
          error: toStorageFailure(error, input.oldKey),
        };
      }
    },
    async downloadStoredImage(key) {
      try {
        const response = await client.get(key);
        if (!response.Body) {
          return {
            ok: false,
            error: {
              reason: "unknown",
              message: `S3 returned no body for ${key}`,
            },
          };
        }
        return {
          ok: true,
          value: {
            key,
            body: await toBlob(response.Body),
          },
        };
      } catch (error) {
        return {
          ok: false,
          error: toStorageFailure(error, key),
        };
      }
    },
    async probeStoredImage(key) {
      try {
        const response = await client.head(key);
        return {
          ok: true,
          value: {
            key,
            lastModified: response.LastModified?.toISOString(),
            contentType: response.ContentType,
            size: response.ContentLength,
          },
        };
      } catch (error) {
        return {
          ok: false,
          error: toStorageFailure(error, key),
        };
      }
    },
    async checkAccess(input) {
      try {
        const response = await client.getCors();
        const allowedMethods = toAllowedStorageMethods(
          response.CORSRules?.flatMap((rule) =>
            corsRuleMatchesAccessCheck(rule, input.origin)
              ? (rule.AllowedMethods ?? [])
              : [],
          ) ??
            [],
        );
        const missingMethods = requiredStorageAccessMethods.filter(
          (method) => !allowedMethods.includes(method),
        );

        if (missingMethods.length > 0) {
          return {
            ok: false,
            error: {
              reason: "cors-incomplete",
              allowedMethods,
              missingMethods,
            },
          };
        }

        return { ok: true, value: { allowedMethods } };
      } catch (error) {
        return {
          ok: false,
          error: toStorageFailure(error),
        };
      }
    },
  };
}

function toStoredImage(
  image: ListedS3ImageObject,
  settings: S3Options,
): StoredImage {
  return {
    key: image.Key,
    lastModified: image.LastModified,
    url: image.url || s3Key2Url(image.Key, settings),
  };
}

function toStorageFailure(
  error: unknown,
  key?: string,
): ImageStorageFailure {
  if (isNotFoundError(error) && key) {
    return { reason: "not-found", key };
  }
  if (isAccessDeniedError(error)) {
    return { reason: "access-denied" };
  }

  return {
    reason: "unknown",
    message: error instanceof Error ? error.message : String(error),
  };
}

function isNotFoundError(error: unknown) {
  const awsError = toAwsError(error);
  return (
    awsError.$metadata?.httpStatusCode === 404 ||
    awsError.name === "NotFound" ||
    awsError.name === "NoSuchKey"
  );
}

function isAccessDeniedError(error: unknown) {
  const awsError = toAwsError(error);
  return (
    awsError.$metadata?.httpStatusCode === 403 ||
    awsError.name === "AccessDenied"
  );
}

function isAlreadyExistsError(error: unknown) {
  return (
    error instanceof Error && error.message.includes("Object already exists")
  );
}

function isPartialRenameError(error: unknown) {
  return (
    error instanceof Error && error.message.includes("failed to delete old key")
  );
}

function toAwsError(error: unknown): {
  $metadata?: { httpStatusCode?: number };
  name?: string;
} {
  if (typeof error === "object" && error !== null) {
    return error as {
      $metadata?: { httpStatusCode?: number };
      name?: string;
    };
  }
  return {};
}

function toAllowedStorageMethods(methods: readonly string[]) {
  const allowedMethods = new Set<StorageAccessMethod>();
  for (const method of methods) {
    const result = storageAccessMethodSchema.safeParse(method);
    if (result.success) {
      allowedMethods.add(result.data);
    }
  }
  return [...allowedMethods];
}

function corsRuleMatchesAccessCheck(
  rule: {
    AllowedOrigins?: readonly string[];
    AllowedHeaders?: readonly string[];
  },
  origin: string,
) {
  return (
    (rule.AllowedOrigins?.includes(origin) ||
      rule.AllowedOrigins?.includes("*")) &&
    rule.AllowedHeaders?.includes("*")
  );
}

async function toBlob(body: unknown): Promise<Blob> {
  if (body instanceof Blob) {
    return body;
  }
  if (body instanceof ReadableStream) {
    return await new Response(body).blob();
  }
  if (typeof body === "string") {
    return new Blob([body]);
  }

  const maybeSdkStream = body as {
    transformToByteArray?: () => Promise<Uint8Array>;
  };
  if (typeof maybeSdkStream.transformToByteArray === "function") {
    const bytes = await maybeSdkStream.transformToByteArray();
    const bytesCopy = new Uint8Array(bytes.byteLength);
    bytesCopy.set(bytes);
    return new Blob([bytesCopy.buffer]);
  }

  throw new Error("S3 returned an unsupported body type");
}
