import { describe, expect, it } from "vitest";

import {
  catalogKernel,
  parseCatalogCache,
  serializeCatalogCache,
} from "./catalog-kernel";

describe("catalog cache data", () => {
  it("classifies an absent payload without inventing a known-empty listing", () => {
    expect(parseCatalogCache(null)).toEqual({
      classification: "absent",
      images: [],
    });
  });

  it.each(["not-json", '{"key":"not-an-array"}'])(
    "classifies a malformed payload %s with a load diagnostic",
    (raw) => {
      const result = parseCatalogCache(raw);

      expect(result.classification).toBe("malformed");
      expect(result.images).toEqual([]);
      expect(result.diagnostic).toMatchObject({ operation: "load" });
    },
  );

  it("distinguishes a valid cached empty projection from an absent cache", () => {
    expect(parseCatalogCache("[]")).toEqual({
      classification: "cached-empty",
      images: [],
    });
  });

  it("classifies a valid non-empty cached projection as ready", () => {
    const images = [
      { key: "i/one.webp", lastModified: "2026-07-10T12:00:00.000Z" },
    ];

    expect(parseCatalogCache(JSON.stringify(images))).toEqual({
      classification: "ready",
      images,
    });
  });

  it("canonicalizes duplicate cached keys with the last value at the first position", () => {
    expect(
      parseCatalogCache(
        JSON.stringify([
          { key: "i/same.webp", lastModified: "old" },
          { key: "i/other.webp" },
          { key: "i/same.webp", lastModified: "new" },
        ]),
      ),
    ).toEqual({
      classification: "ready",
      images: [
        { key: "i/same.webp", lastModified: "new" },
        { key: "i/other.webp" },
      ],
    });
  });

  it("serializes the existing bare StoredImage array payload", () => {
    expect(
      serializeCatalogCache([
        { key: "i/confirmed.webp", lastModified: "2026-07-10T12:00:00.000Z" },
      ]),
    ).toBe(
      '[{"key":"i/confirmed.webp","lastModified":"2026-07-10T12:00:00.000Z"}]',
    );
    expect(serializeCatalogCache([])).toBe("[]");
  });
});

describe("catalog projection", () => {
  it("distinguishes an accepted empty listing from cached empty data", () => {
    const projection = catalogKernel.create(parseCatalogCache("[]"));
    const listing = catalogKernel.beginListing(projection);

    const listed = catalogKernel.reduce(projection, {
      type: "listing-received",
      listing,
      images: [],
    });

    expect(listed.classification).toBe("listed-empty");
    expect(listed.images).toEqual([]);
    expect(listed.images).toBe(projection.images);
  });

  it("canonicalizes duplicate listing keys before publishing", () => {
    const projection = catalogKernel.create(parseCatalogCache(null));

    const listed = catalogKernel.reduce(projection, {
      type: "listing-received",
      listing: catalogKernel.beginListing(projection),
      images: [
        { key: "i/same.webp", lastModified: "old" },
        { key: "i/other.webp" },
        { key: "i/same.webp", lastModified: "new" },
      ],
    });

    expect(listed.images).toEqual([
      { key: "i/same.webp", lastModified: "new" },
      { key: "i/other.webp" },
    ]);
  });

  it("applies a confirmed upload immediately", () => {
    const projection = catalogKernel.create(parseCatalogCache(null));

    const uploaded = catalogKernel.reduce(projection, {
      type: "upload-confirmed",
      uploadId: "upload-1",
      image: { key: "i/uploaded.webp" },
    });

    expect(uploaded.classification).toBe("ready");
    expect(uploaded.images).toEqual([{ key: "i/uploaded.webp" }]);
    expect(uploaded.revision).toBe(1);
    expect(uploaded.journal[0]).not.toHaveProperty("uploadId");
  });

  it("upserts a confirmed upload without leaving a duplicate key", () => {
    let projection = catalogKernel.create(parseCatalogCache(null));
    projection = catalogKernel.reduce(projection, {
      type: "listing-received",
      listing: catalogKernel.beginListing(projection),
      images: [
        { key: "i/same.webp", lastModified: "old-1" },
        { key: "i/same.webp", lastModified: "old-2" },
      ],
    });

    projection = catalogKernel.reduce(projection, {
      type: "upload-confirmed",
      uploadId: "upload-upsert",
      image: { key: "i/same.webp", lastModified: "confirmed" },
    });

    expect(projection.images).toEqual([
      { key: "i/same.webp", lastModified: "confirmed" },
    ]);
  });

  it("applies a confirmed delete with canonical unique keys", () => {
    const projection = catalogKernel.create(
      parseCatalogCache('[{"key":"i/a.webp"},{"key":"i/b.webp"}]'),
    );

    const deleted = catalogKernel.reduce(projection, {
      type: "delete-confirmed",
      operationId: "delete-1",
      deletedKeys: ["i/b.webp", "i/a.webp", "i/b.webp"],
    });

    expect(deleted.images).toEqual([]);
    expect(deleted.journal[0]).toMatchObject({
      type: "delete-confirmed",
      deletedKeys: ["i/a.webp", "i/b.webp"],
    });
    expect(deleted.journal[0]).not.toHaveProperty("operationId");
  });

  it("replaces a rename destination at the source ordering position", () => {
    const projection = catalogKernel.create(
      parseCatalogCache(
        JSON.stringify([
          { key: "before.webp" },
          { key: "old.webp", lastModified: "old" },
          { key: "new.webp", lastModified: "destination" },
          { key: "after.webp" },
        ]),
      ),
    );

    const renamed = catalogKernel.reduce(projection, {
      type: "rename-confirmed",
      operationId: "rename-1",
      oldKey: "old.webp",
      newImage: { key: "new.webp", lastModified: "confirmed" },
    });

    expect(renamed.images).toEqual([
      { key: "before.webp" },
      { key: "new.webp", lastModified: "confirmed" },
      { key: "after.webp" },
    ]);
    expect(renamed.journal[0]).not.toHaveProperty("operationId");
  });

  it("retains the source position when the rename destination sorts earlier", () => {
    const projection = catalogKernel.create(
      parseCatalogCache(
        JSON.stringify([
          { key: "before.webp" },
          { key: "new.webp", lastModified: "destination" },
          { key: "middle.webp" },
          { key: "old.webp", lastModified: "old" },
          { key: "after.webp" },
        ]),
      ),
    );

    const renamed = catalogKernel.reduce(projection, {
      type: "rename-confirmed",
      operationId: "rename-earlier-destination",
      oldKey: "old.webp",
      newImage: { key: "new.webp", lastModified: "confirmed" },
    });

    expect(renamed.images).toEqual([
      { key: "before.webp" },
      { key: "middle.webp" },
      { key: "new.webp", lastModified: "confirmed" },
      { key: "after.webp" },
    ]);
  });

  it.each(["fact-first", "listing-first"] as const)(
    "keeps a confirmed upload when an older listing completes %s",
    (order) => {
      let projection = catalogKernel.create(parseCatalogCache(null));
      const listing = catalogKernel.beginListing(projection);
      const receiveListing = () => {
        projection = catalogKernel.reduce(projection, {
          type: "listing-received",
          listing,
          images: [{ key: "i/listed.webp" }],
        });
      };
      const confirmUpload = () => {
        projection = catalogKernel.reduce(projection, {
          type: "upload-confirmed",
          uploadId: "upload-race",
          image: { key: "i/uploaded.webp" },
        });
      };

      if (order === "fact-first") {
        confirmUpload();
        receiveListing();
      } else {
        receiveListing();
        confirmUpload();
      }

      expect(projection.images).toEqual([
        { key: "i/listed.webp" },
        { key: "i/uploaded.webp" },
      ]);
    },
  );

  it.each(["fact-first", "listing-first"] as const)(
    "keeps a confirmed delete when an older listing completes %s",
    (order) => {
      let projection = catalogKernel.create(
        parseCatalogCache('[{"key":"i/delete.webp"}]'),
      );
      const listing = catalogKernel.beginListing(projection);
      const receiveListing = () => {
        projection = catalogKernel.reduce(projection, {
          type: "listing-received",
          listing,
          images: [{ key: "i/delete.webp" }, { key: "i/keep.webp" }],
        });
      };
      const confirmDelete = () => {
        projection = catalogKernel.reduce(projection, {
          type: "delete-confirmed",
          operationId: "delete-race",
          deletedKeys: ["i/delete.webp"],
        });
      };

      if (order === "fact-first") {
        confirmDelete();
        receiveListing();
      } else {
        receiveListing();
        confirmDelete();
      }

      expect(projection.images).toEqual([{ key: "i/keep.webp" }]);
    },
  );

  it.each(["fact-first", "listing-first"] as const)(
    "keeps a confirmed rename when an older listing completes %s",
    (order) => {
      let projection = catalogKernel.create(
        parseCatalogCache('[{"key":"i/old.webp"}]'),
      );
      const listing = catalogKernel.beginListing(projection);
      const receiveListing = () => {
        projection = catalogKernel.reduce(projection, {
          type: "listing-received",
          listing,
          images: [
            { key: "i/before.webp" },
            { key: "i/old.webp" },
            { key: "i/new.webp", lastModified: "destination" },
            { key: "i/after.webp" },
          ],
        });
      };
      const confirmRename = () => {
        projection = catalogKernel.reduce(projection, {
          type: "rename-confirmed",
          operationId: "rename-race",
          oldKey: "i/old.webp",
          newImage: { key: "i/new.webp" },
        });
      };

      if (order === "fact-first") {
        confirmRename();
        receiveListing();
      } else {
        receiveListing();
        confirmRename();
      }

      expect(projection.images).toEqual([
        { key: "i/before.webp" },
        { key: "i/new.webp" },
        { key: "i/after.webp" },
      ]);
    },
  );

  it("captures the listing start revision and replays only newer facts", () => {
    let projection = catalogKernel.create(parseCatalogCache(null));
    projection = catalogKernel.reduce(projection, {
      type: "upload-confirmed",
      uploadId: "before-start",
      image: { key: "i/before-start.webp" },
    });
    const listing = catalogKernel.beginListing(projection);
    projection = catalogKernel.reduce(projection, {
      type: "upload-confirmed",
      uploadId: "after-start",
      image: { key: "i/after-start.webp" },
    });

    projection = catalogKernel.reduce(projection, {
      type: "listing-received",
      listing,
      images: [{ key: "i/listed.webp" }],
    });

    expect(listing.startedRevision).toBe(1);
    expect(projection.images).toEqual([
      { key: "i/listed.webp" },
      { key: "i/after-start.webp" },
    ]);
  });

  it("prunes confirmed facts only after no active listing needs them", () => {
    let projection = catalogKernel.create(parseCatalogCache(null));
    projection = catalogKernel.reduce(projection, {
      type: "upload-confirmed",
      uploadId: "upload-1",
      image: { key: "i/one.webp" },
    });

    const stillNeeded = catalogKernel.reduce(projection, {
      type: "prune-journal",
      oldestRequiredRevision: 0,
    });
    const noLongerNeeded = catalogKernel.reduce(stillNeeded, {
      type: "prune-journal",
    });

    expect(stillNeeded.journal).toHaveLength(1);
    expect(noLongerNeeded.journal).toEqual([]);
    expect(noLongerNeeded.images).toBe(projection.images);
  });

  it("remembers a confirmed upload after its replay fact is pruned", () => {
    let projection = catalogKernel.create(parseCatalogCache(null));
    const upload = {
      type: "upload-confirmed" as const,
      uploadId: "upload-survives-prune",
      image: { key: "i/uploaded.webp" },
    };
    projection = catalogKernel.reduce(projection, upload);
    projection = catalogKernel.reduce(projection, { type: "prune-journal" });

    expect(projection.journal).toEqual([]);
    expect(catalogKernel.reduce(projection, upload)).toBe(projection);
  });

  it("bounds recent upload IDs and eventually admits an evicted ID", () => {
    let projection = catalogKernel.create(parseCatalogCache(null));
    for (let index = 0; index < 33; index++) {
      projection = catalogKernel.reduce(projection, {
        type: "upload-confirmed",
        uploadId: `upload-${index}`,
        image: { key: "i/window.webp", lastModified: String(index) },
      });
    }
    const beforeReuse = projection;

    projection = catalogKernel.reduce(projection, {
      type: "upload-confirmed",
      uploadId: "upload-0",
      image: { key: "i/window.webp", lastModified: "reused" },
    });

    expect(beforeReuse.recentUploadIds).toHaveLength(32);
    expect(projection.recentUploadIds).toHaveLength(32);
    expect(projection.revision).toBe(34);
    expect(projection.images).toEqual([
      { key: "i/window.webp", lastModified: "reused" },
    ]);
  });

  it("allows settled delete and rename command IDs to be reused", () => {
    let deleted = catalogKernel.create(
      parseCatalogCache('[{"key":"i/a.webp"},{"key":"i/b.webp"}]'),
    );
    deleted = catalogKernel.reduce(deleted, {
      type: "delete-confirmed",
      operationId: "reused-delete",
      deletedKeys: ["i/a.webp"],
    });
    deleted = catalogKernel.reduce(deleted, {
      type: "delete-confirmed",
      operationId: "reused-delete",
      deletedKeys: ["i/b.webp"],
    });

    let renamed = catalogKernel.create(
      parseCatalogCache('[{"key":"i/a.webp"}]'),
    );
    renamed = catalogKernel.reduce(renamed, {
      type: "rename-confirmed",
      operationId: "reused-rename",
      oldKey: "i/a.webp",
      newImage: { key: "i/b.webp" },
    });
    renamed = catalogKernel.reduce(renamed, {
      type: "rename-confirmed",
      operationId: "reused-rename",
      oldKey: "i/b.webp",
      newImage: { key: "i/c.webp" },
    });

    expect(deleted.images).toEqual([]);
    expect(deleted.revision).toBe(2);
    expect(renamed.images).toEqual([{ key: "i/c.webp" }]);
    expect(renamed.revision).toBe(2);
  });

  it("preserves projection identity for a semantically unchanged listing", () => {
    const projection = catalogKernel.create(
      parseCatalogCache(
        '[{"key":"i/same.webp","lastModified":"2026-07-10T12:00:00.000Z"}]',
      ),
    );
    const listing = catalogKernel.beginListing(projection);

    const unchanged = catalogKernel.reduce(projection, {
      type: "listing-received",
      listing,
      images: [
        { key: "i/same.webp", lastModified: "2026-07-10T12:00:00.000Z" },
      ],
    });

    expect(unchanged).toBe(projection);
    expect(unchanged.images).toBe(projection.images);
  });

  it("treats a duplicate confirmed upload as a semantic no-op", () => {
    let projection = catalogKernel.create(parseCatalogCache(null));
    const fact = {
      type: "upload-confirmed" as const,
      uploadId: "same-upload",
      image: { key: "i/uploaded.webp" },
    };
    projection = catalogKernel.reduce(projection, fact);

    expect(catalogKernel.reduce(projection, fact)).toBe(projection);
  });

  it.each([
    {
      name: "upload",
      fact: {
        type: "upload-confirmed",
        uploadId: "upload-same-value",
        image: { key: "i/same.webp", lastModified: "same" },
      },
    },
    {
      name: "delete",
      fact: {
        type: "delete-confirmed",
        operationId: "delete-missing",
        deletedKeys: ["i/missing.webp"],
      },
    },
    {
      name: "rename",
      fact: {
        type: "rename-confirmed",
        operationId: "rename-to-same-value",
        oldKey: "i/missing.webp",
        newImage: { key: "i/same.webp", lastModified: "same" },
      },
    },
  ])(
    "preserves stored-image identity for a semantic $name no-op",
    ({ fact }) => {
      const projection = catalogKernel.create(
        parseCatalogCache('[{"key":"i/same.webp","lastModified":"same"}]'),
      );

      const confirmed = catalogKernel.reduce(projection, fact);

      expect(confirmed.images).toBe(projection.images);
      expect(confirmed.revision).toBe(1);
    },
  );

  it("resets projection state for a new profile generation", () => {
    let projection = catalogKernel.create(
      parseCatalogCache('[{"key":"i/old.webp"}]'),
      4,
    );
    const oldListing = catalogKernel.beginListing(projection);
    projection = catalogKernel.reduce(projection, {
      type: "delete-confirmed",
      operationId: "delete-before-reset",
      deletedKeys: ["i/old.webp"],
    });

    const reset = catalogKernel.reduce(projection, {
      type: "generation-reset",
      generation: 5,
    });
    const lateListing = catalogKernel.reduce(reset, {
      type: "listing-received",
      listing: oldListing,
      images: [{ key: "i/late.webp" }],
    });

    expect(reset).toMatchObject({
      classification: "absent",
      images: [],
      generation: 5,
      revision: 0,
      journal: [],
    });
    expect(lateListing).toBe(reset);
  });

  it("clears recent upload identity when the generation resets", () => {
    let projection = catalogKernel.create(parseCatalogCache(null), 4);
    projection = catalogKernel.reduce(projection, {
      type: "upload-confirmed",
      uploadId: "same-upload",
      image: { key: "i/old.webp" },
    });
    projection = catalogKernel.reduce(projection, {
      type: "generation-reset",
      generation: 5,
    });

    projection = catalogKernel.reduce(projection, {
      type: "upload-confirmed",
      uploadId: "same-upload",
      image: { key: "i/new.webp" },
    });

    expect(projection.generation).toBe(5);
    expect(projection.revision).toBe(1);
    expect(projection.images).toEqual([{ key: "i/new.webp" }]);
  });

  it.each(["persist", "clear"] as const)(
    "records a %s cache failure without rolling back accepted memory",
    (operation) => {
      const projection = catalogKernel.create(
        parseCatalogCache('[{"key":"i/accepted.webp"}]'),
      );
      const images = projection.images;
      const error = new Error("quota exceeded");

      const diagnosed = catalogKernel.reduce(projection, {
        type: "cache-write-failed",
        operation,
        error,
      });

      expect(diagnosed.images).toBe(images);
      expect(diagnosed).toMatchObject({
        classification: "ready",
        images: [{ key: "i/accepted.webp" }],
        diagnostic: { operation, error },
      });
      expect(diagnosed.revision).toBe(projection.revision);
    },
  );
});
