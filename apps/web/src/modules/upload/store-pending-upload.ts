import type { createStore } from "jotai";

import {
  createS3ImageStorage,
  type CreateImageStorageFromSettings,
} from "@/modules/image-storage";
import { imageCatalog } from "@/modules/image-catalog";
import { profileGenerationAtom } from "@/modules/settings/profile-generation";
import { settings } from "@/stores/atoms/settings";

export function createStorePendingUpload({
  store,
  catalog = imageCatalog,
  createStorage = createS3ImageStorage,
  onUploadFailed,
}: {
  store: ReturnType<typeof createStore>;
  catalog?: typeof imageCatalog;
  createStorage?: CreateImageStorageFromSettings;
  onUploadFailed: (file: File, error: unknown) => void;
}) {
  return async function storePendingUpload({
    uploadId,
    file,
    body,
    key,
  }: {
    uploadId: string;
    file: File;
    body: File;
    key: string;
  }) {
    const storage = store.get(settings.storage);
    if (storage.validation.status !== "valid") {
      return {
        status: "failed",
        error: { reason: "not-configured" },
      } as const;
    }
    const catalogState = store.get(catalog.state);
    if (
      !catalogState.projection.usable &&
      catalogState.projection.kind !== "unloaded"
    ) {
      return {
        status: "failed",
        error: { reason: "target-mismatch" },
      } as const;
    }
    const request = {
      settings: storage.validation.value,
      generation: store.get(profileGenerationAtom),
      storageRevision: storage.revision,
    };
    const requestIsCurrent = () => {
      const current = store.get(settings.storage);
      return (
        current.validation.status === "valid" &&
        current.revision === request.storageRevision &&
        store.get(profileGenerationAtom) === request.generation
      );
    };

    try {
      const result = await createStorage(request.settings).putStoredImage({
        key,
        body,
        contentType: body.type || undefined,
      });
      if (!result.ok) {
        onUploadFailed(file, result.error);
        return { status: "failed", error: result.error } as const;
      }
      if (!requestIsCurrent()) {
        return {
          status: "failed",
          error: { reason: "superseded" },
        } as const;
      }

      const fact = {
        type: "upload-confirmed" as const,
        uploadId,
        image: result.value,
        generation: request.generation,
        storageRevision: request.storageRevision,
      };
      const integration = store.set(catalog.integrate, fact);
      if (
        integration.status === "accepted" ||
        integration.status === "duplicate"
      ) {
        return { status: "stored", image: result.value } as const;
      }
      if (integration.status === "stale") {
        return {
          status: "failed",
          error: { reason: "superseded" },
        } as const;
      }

      void store.set(catalog.run, {
        type: "refresh",
        intent: "background",
        reason: "reconciliation",
      });
      return {
        status: "stored-unreconciled",
        image: result.value,
      } as const;
    } catch (error) {
      onUploadFailed(file, error);
      return {
        status: "failed",
        error: { reason: "unknown", message: "Upload failed", cause: error },
      } as const;
    }
  };
}
