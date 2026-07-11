import { z } from "zod";

import {
  storedImageSchema,
  storageKeySchema,
} from "@/modules/image-storage/schema";

const RECENT_UPLOAD_ID_LIMIT = 32;

export const catalogStoredImagesSchema = z
  .array(storedImageSchema)
  .transform((images) => {
    const uniqueImages = new Map<string, (typeof images)[number]>();
    for (const image of images) {
      uniqueImages.set(image.key, image);
    }
    return [...uniqueImages.values()];
  });

const operationIdSchema = z.string().min(1);
const uploadIdSchema = z.string().min(1);

const uploadConfirmedSchema = z.object({
  type: z.literal("upload-confirmed"),
  uploadId: uploadIdSchema,
  image: storedImageSchema,
});

const deleteConfirmedSchema = z.object({
  type: z.literal("delete-confirmed"),
  operationId: operationIdSchema,
  deletedKeys: z
    .array(storageKeySchema)
    .transform((keys) => [...new Set(keys)].sort()),
});

const renameConfirmedSchema = z.object({
  type: z.literal("rename-confirmed"),
  operationId: operationIdSchema,
  oldKey: storageKeySchema,
  newImage: storedImageSchema,
});

export const confirmedCatalogFactSchema = z.discriminatedUnion("type", [
  uploadConfirmedSchema,
  deleteConfirmedSchema,
  renameConfirmedSchema,
]);

const versionedConfirmedCatalogFactSchema = z.discriminatedUnion("type", [
  uploadConfirmedSchema
    .omit({ uploadId: true })
    .extend({ revision: z.number().int().nonnegative() }),
  deleteConfirmedSchema
    .omit({ operationId: true })
    .extend({ revision: z.number().int().nonnegative() }),
  renameConfirmedSchema
    .omit({ operationId: true })
    .extend({ revision: z.number().int().nonnegative() }),
]);

const catalogProjectionSchema = z.object({
  classification: z.enum([
    "absent",
    "malformed",
    "cached-empty",
    "listed-empty",
    "ready",
  ]),
  images: catalogStoredImagesSchema,
  generation: z.number().int().nonnegative(),
  revision: z.number().int().nonnegative(),
  journal: z.array(versionedConfirmedCatalogFactSchema),
  recentUploadIds: z.array(uploadIdSchema).max(RECENT_UPLOAD_ID_LIMIT),
  diagnostic: z
    .object({
      operation: z.enum(["load", "persist", "clear"]),
      error: z.unknown(),
    })
    .optional(),
});

const listingSchema = z.object({
  generation: z.number().int().nonnegative(),
  startedRevision: z.number().int().nonnegative(),
});

const catalogChangeSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("listing-received"),
    listing: listingSchema,
    images: catalogStoredImagesSchema,
  }),
  uploadConfirmedSchema,
  deleteConfirmedSchema,
  renameConfirmedSchema,
  z.object({
    type: z.literal("prune-journal"),
    oldestRequiredRevision: z.number().int().nonnegative().optional(),
  }),
  z.object({
    type: z.literal("generation-reset"),
    generation: z.number().int().nonnegative(),
  }),
  z.object({
    type: z.literal("cache-write-failed"),
    operation: z.enum(["persist", "clear"]),
    error: z.unknown(),
  }),
]);

export function serializeCatalogCache(images: unknown) {
  return JSON.stringify(catalogStoredImagesSchema.parse(images));
}

export function parseCatalogCache(raw: string | null) {
  if (raw === null) {
    return { classification: "absent" as const, images: [] };
  }

  try {
    const parsed = catalogStoredImagesSchema.safeParse(JSON.parse(raw));
    if (!parsed.success) {
      return {
        classification: "malformed" as const,
        images: [],
        diagnostic: { operation: "load" as const, error: parsed.error },
      };
    }

    if (parsed.data.length === 0) {
      return { classification: "cached-empty" as const, images: parsed.data };
    }

    return { classification: "ready" as const, images: parsed.data };
  } catch (error) {
    return {
      classification: "malformed" as const,
      images: [],
      diagnostic: { operation: "load" as const, error },
    };
  }
}

export const catalogKernel = {
  create(source = parseCatalogCache(null), generation = 0) {
    return catalogProjectionSchema.parse({
      ...source,
      generation,
      revision: 0,
      journal: [],
      recentUploadIds: [],
    });
  },

  beginListing(projection: z.infer<typeof catalogProjectionSchema>) {
    return {
      generation: projection.generation,
      startedRevision: projection.revision,
    };
  },

  reduce(projection: z.infer<typeof catalogProjectionSchema>, input: unknown) {
    const change = catalogChangeSchema.parse(input);

    if (
      change.type === "upload-confirmed" ||
      change.type === "delete-confirmed" ||
      change.type === "rename-confirmed"
    ) {
      if (
        change.type === "upload-confirmed" &&
        projection.recentUploadIds.includes(change.uploadId)
      ) {
        return projection;
      }

      const confirmed = versionedConfirmedCatalogFactSchema.parse({
        ...change,
        revision: projection.revision + 1,
      });
      const images = applyConfirmedCatalogFact(projection.images, confirmed);
      const publishedImages = areStoredImagesEqual(images, projection.images)
        ? projection.images
        : images;

      return {
        ...projection,
        classification:
          publishedImages.length === 0
            ? ("listed-empty" as const)
            : ("ready" as const),
        images: publishedImages,
        revision: confirmed.revision,
        journal: [...projection.journal, confirmed],
        recentUploadIds:
          change.type === "upload-confirmed"
            ? [...projection.recentUploadIds, change.uploadId].slice(
                -RECENT_UPLOAD_ID_LIMIT,
              )
            : projection.recentUploadIds,
      };
    }

    if (change.type === "listing-received") {
      if (change.listing.generation !== projection.generation) {
        return projection;
      }

      let images = change.images;
      for (const confirmed of projection.journal) {
        if (confirmed.revision > change.listing.startedRevision) {
          images = applyConfirmedCatalogFact(images, confirmed);
        }
      }

      const classification =
        images.length === 0 ? ("listed-empty" as const) : ("ready" as const);
      const publishedImages = areStoredImagesEqual(images, projection.images)
        ? projection.images
        : images;
      if (
        classification === projection.classification &&
        publishedImages === projection.images
      ) {
        return projection;
      }

      return {
        ...projection,
        classification,
        images: publishedImages,
      };
    }

    if (change.type === "prune-journal") {
      const oldestRequiredRevision = change.oldestRequiredRevision;
      const journal =
        oldestRequiredRevision === undefined
          ? []
          : projection.journal.filter(
              (confirmed) => confirmed.revision > oldestRequiredRevision,
            );
      return journal.length === projection.journal.length
        ? projection
        : { ...projection, journal };
    }

    if (change.type === "generation-reset") {
      return catalogKernel.create(parseCatalogCache(null), change.generation);
    }

    if (change.type === "cache-write-failed") {
      return {
        ...projection,
        diagnostic: { operation: change.operation, error: change.error },
      };
    }

    throw new Error("Unknown catalog change");
  },
};

function applyConfirmedCatalogFact(
  current: z.infer<typeof catalogStoredImagesSchema>,
  fact: z.infer<typeof versionedConfirmedCatalogFactSchema>,
) {
  if (fact.type === "upload-confirmed") {
    const index = current.findIndex((image) => image.key === fact.image.key);
    if (index === -1) {
      return [...current, fact.image];
    }

    const images = current.filter((image) => image.key !== fact.image.key);
    images.splice(Math.min(index, images.length), 0, fact.image);
    return images;
  }

  if (fact.type === "delete-confirmed") {
    const deletedKeys = new Set(fact.deletedKeys);
    return current.filter((image) => !deletedKeys.has(image.key));
  }

  if (fact.type === "rename-confirmed") {
    const oldIndex = current.findIndex((image) => image.key === fact.oldKey);
    if (oldIndex === -1) {
      const destinationIndex = current.findIndex(
        (image) => image.key === fact.newImage.key,
      );
      if (destinationIndex === -1) {
        return [...current, fact.newImage];
      }

      const images = [...current];
      images[destinationIndex] = fact.newImage;
      return images;
    }

    const insertionIndex = current
      .slice(0, oldIndex)
      .filter((image) => image.key !== fact.newImage.key).length;
    const images = current.filter(
      (image) => image.key !== fact.oldKey && image.key !== fact.newImage.key,
    );
    images.splice(insertionIndex, 0, fact.newImage);
    return images;
  }

  throw new Error("Unknown confirmed catalog fact");
}

function areStoredImagesEqual(
  left: z.infer<typeof catalogStoredImagesSchema>,
  right: z.infer<typeof catalogStoredImagesSchema>,
) {
  return (
    left.length === right.length &&
    left.every(
      (image, index) =>
        image.key === right[index]?.key &&
        image.lastModified === right[index]?.lastModified,
    )
  );
}
