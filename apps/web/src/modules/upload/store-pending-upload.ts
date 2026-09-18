import type { createStore } from "jotai";
import { s3Key2Url } from "@/lib/s3/s3-key";
import {
  isExplicitStorageRejection,
  storageFailureDetails,
} from "@/modules/image-storage/failure-details";
import type { PendingUploadResult, StoredUploadResult } from "./types";

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
  }): Promise<PendingUploadResult> {
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

    let confirmed: StoredUploadResult;
    try {
      const result = await createStorage(request.settings).putStoredImage({
        key,
        body,
        contentType: body.type || undefined,
      });
      if (!result.ok) {
        onUploadFailed(file, result.error);
        return {
          status: isExplicitStorageRejection(result.error)
            ? "failed"
            : "unconfirmed",
          error: result.error,
        };
      }
      confirmed = {
        status: "stored-unreconciled",
        image: result.value,
        receipt: {
          endpoint: request.settings.endpoint,
          bucket: request.settings.bucket,
          region: request.settings.region,
          url: s3Key2Url(result.value.key, request.settings),
        },
      };
    } catch (error) {
      onUploadFailed(file, error);
      return {
        status: "unconfirmed",
        error: {
          reason: "unknown",
          message: "Upload response unavailable",
          details: storageFailureDetails(error),
        },
      };
    }

    // Once PUT succeeds, local catalog work must never turn it into a failure.
    if (!requestIsCurrent())
      return { ...confirmed, status: "stored-previous-target" };
    try {
      const integration = store.set(catalog.integrate, {
        type: "upload-confirmed",
        uploadId,
        image: confirmed.image,
        generation: request.generation,
        storageRevision: request.storageRevision,
      });
      if (
        integration.status === "accepted" ||
        integration.status === "duplicate"
      ) {
        return { ...confirmed, status: "stored" };
      }
      if (integration.status === "stale") {
        return { ...confirmed, status: "stored-previous-target" };
      }
      void store
        .set(catalog.run, {
          type: "refresh",
          intent: "background",
          reason: "reconciliation",
        })
        .catch(() => {});
    } catch {
      // The receipt remains usable even if the local projection cannot update.
    }
    return confirmed;
  };
}
