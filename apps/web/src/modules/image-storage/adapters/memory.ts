import type {
  StoredImage,
  StorageAccessMethod,
  StoredImageMetadata,
} from "../schema";
import { requiredStorageAccessMethods } from "../schema";
import type { ImageStorage, StoredImageBody } from "../storage";

type StoredImageRecord = {
  image: StoredImage;
  body: Blob;
  contentType?: string;
};

export type MemoryImageStorageAdapterOptions = {
  images?: readonly StoredImage[];
  bodies?: Readonly<Record<string, StoredImageBody>>;
  now?: () => Date;
  allowedMethods?: readonly StorageAccessMethod[];
  accessDenied?: boolean;
};

export function createMemoryImageStorageAdapter(
  options: MemoryImageStorageAdapterOptions = {},
): ImageStorage {
  const now = options.now ?? (() => new Date());
  const records = new Map<string, StoredImageRecord>();

  for (const image of options.images ?? []) {
    const seededBody = options.bodies?.[image.key];
    const body = toBlob(seededBody ?? "", undefined);
    records.set(image.key, {
      image,
      body,
      contentType: body.type || undefined,
    });
  }

  return {
    async listStoredImages() {
      return {
        ok: true,
        value: [...records.values()].map(({ image }) => image),
      };
    },
    async putStoredImage(input) {
      const body = toBlob(input.body, input.contentType);
      const image: StoredImage = {
        key: input.key,
        lastModified: now().toISOString(),
      };
      records.set(input.key, {
        image,
        body,
        contentType: input.contentType ?? (body.type || undefined),
      });
      return { ok: true, value: image };
    },
    async deleteStoredImages(keys) {
      const deletedKeys: string[] = [];
      for (const key of keys) {
        if (records.delete(key)) {
          deletedKeys.push(key);
        }
      }
      return { ok: true, value: { deletedKeys } };
    },
    async renameStoredImage(input) {
      const existing = records.get(input.oldKey);
      if (!existing) {
        return { ok: false, error: { reason: "not-found", key: input.oldKey } };
      }
      if (!input.overwrite && records.has(input.newKey)) {
        return {
          ok: false,
          error: { reason: "already-exists", key: input.newKey },
        };
      }

      records.delete(input.oldKey);
      records.set(input.newKey, {
        ...existing,
        image: {
          ...existing.image,
          key: input.newKey,
          lastModified: now().toISOString(),
        },
      });

      return {
        ok: true,
        value: { oldKey: input.oldKey, newKey: input.newKey },
      };
    },
    async downloadStoredImage(key) {
      const existing = records.get(key);
      if (!existing) {
        return { ok: false, error: { reason: "not-found", key } };
      }
      return { ok: true, value: { key, body: existing.body } };
    },
    async probeStoredImage(key) {
      const existing = records.get(key);
      if (!existing) {
        return { ok: false, error: { reason: "not-found", key } };
      }
      return {
        ok: true,
        value: storedImageMetadata(existing),
      };
    },
    async checkAccess() {
      if (options.accessDenied) {
        return { ok: false, error: { reason: "access-denied" } };
      }

      const allowedMethods = [
        ...(options.allowedMethods ?? requiredStorageAccessMethods),
      ];
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
    },
  };
}

function toBlob(body: StoredImageBody, contentType: string | undefined): Blob {
  if (body instanceof Blob) {
    return body;
  }
  return new Blob([body], {
    type: contentType ?? "application/octet-stream",
  });
}

function storedImageMetadata(record: StoredImageRecord): StoredImageMetadata {
  return {
    key: record.image.key,
    lastModified: record.image.lastModified,
    contentType: record.contentType,
    size: record.body.size,
  };
}
