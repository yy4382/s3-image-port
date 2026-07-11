import { compareAsc, compareDesc, isAfter, isBefore, sub } from "date-fns";
import deepEqual from "fast-deep-equal";
import Fuse from "fuse.js";
import { atom } from "jotai";
import { selectAtom } from "jotai/utils";
import { z } from "zod";

import { s3Key2Url } from "@/lib/s3/s3-key";
import {
  createS3ImageStorage,
  storedImageDownloadSchema,
  storedImageMetadataSchema,
  storedImageSchema,
  storageKeySchema,
  type CreateImageStorageFromSettings,
} from "@/modules/image-storage";
import { profileGenerationAtom } from "@/modules/settings/profile-generation";
import { settings } from "@/stores/atoms/settings";
import {
  galleryFilterDefault,
  galleryFilterSchema,
  galleryPageSizeDefault,
  galleryPageSizeSchema,
  timeRangesGetter,
} from "@/stores/schemas/gallery/filter";

import {
  catalogKernel,
  parseCatalogCache,
  serializeCatalogCache,
} from "./catalog-kernel";

const CACHE_KEY = "s3ip:gallery:photos";

const catalogCommandSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("refresh"),
    intent: z.enum(["foreground", "background"]),
    reason: z.enum([
      "manual",
      "empty",
      "startup",
      "reconciliation",
      "profile-replaced",
    ]),
  }),
  z.object({
    type: z.literal("delete"),
    keys: z.array(storageKeySchema),
    commandId: z.string().min(1).optional(),
  }),
  z.object({
    type: z.literal("rename"),
    oldKey: storageKeySchema,
    newKey: storageKeySchema,
    overwrite: z.boolean().optional(),
    commandId: z.string().min(1).optional(),
  }),
  z.object({
    type: z.literal("access"),
    key: storageKeySchema,
    purpose: z.enum(["probe", "download", "url", "markdown"]),
  }),
]);

const catalogIntegrationSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("upload-confirmed"),
    uploadId: z.string().min(1),
    image: storedImageSchema,
    generation: z.number().int().nonnegative(),
    storageRevision: z.number().int().nonnegative(),
  }),
  z.object({ type: z.literal("profile-replaced") }),
]);

const selectionActionSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("toggle"),
    key: storageKeySchema,
    checked: z.union([z.boolean(), z.literal("toggle")]),
    shift: z.boolean(),
  }),
  z.object({ type: z.literal("select-current-page") }),
  z.object({ type: z.literal("clear") }),
]);

function createDeferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((resolvePromise) => {
    resolve = resolvePromise;
  });
  return { promise, resolve };
}

export function createImageCatalog({
  createStorage = createS3ImageStorage,
  cacheStorage,
}: {
  createStorage?: CreateImageStorageFromSettings;
  cacheStorage?: Storage;
} = {}) {
  const projectionAtom = atom(catalogKernel.create());
  const hydratedAtom = atom(false);
  const projectionMetaAtom = atom({
    targetId: undefined as string | undefined,
    stale: true,
  });
  const selectedKeysAtom = atom<Set<string>>(new Set<string>());
  const filterAtom =
    atom<z.infer<typeof galleryFilterSchema>>(galleryFilterDefault);
  const pageAtom = atom(1);
  const pageSizeAtom = atom<z.infer<typeof galleryPageSizeSchema>>(
    galleryPageSizeDefault,
  );
  const refreshAtom = atom({
    status: "idle" as const,
    lastOutcome: undefined as CatalogRunResult | undefined,
  } as
    | {
        status: "idle";
        lastOutcome: CatalogRunResult | undefined;
      }
    | {
        status: "refreshing";
        intent: "foreground" | "background";
        reason: Extract<
          z.infer<typeof catalogCommandSchema>,
          { type: "refresh" }
        >["reason"];
        lastOutcome: CatalogRunResult | undefined;
      });
  const reservationsAtom = atom<Set<string>>(new Set<string>());
  const nextOperationAtom = atom(0);
  const refreshAttemptAtom = atom(0);

  const activeRefreshAtom = atom(
    undefined as
      | {
          promise: Promise<CatalogRunResult>;
          cancel: () => void;
          resolve: (value: CatalogRunResult) => void;
          generation: number;
          revision: number;
          targetId: string;
        }
      | undefined,
  );
  const queuedRefreshAtom = atom(
    undefined as
      | {
          promise: Promise<CatalogRunResult>;
          resolve: (value: CatalogRunResult) => void;
          command: Extract<
            z.infer<typeof catalogCommandSchema>,
            { type: "refresh" }
          >;
          generation: number;
          revision: number;
          targetId: string;
        }
      | undefined,
  );
  const activeMutationsAtom = atom(
    new Map<
      number,
      {
        token: number;
        promise: Promise<CatalogRunResult>;
        cancel: () => void;
        resolve: (value: CatalogRunResult) => void;
        keys: readonly string[];
        commandId?: string;
        signature: string;
      }
    >(),
  );
  const activeCommandsAtom = atom(
    new Map<
      string,
      {
        token: number;
        promise: Promise<CatalogRunResult>;
        cancel: () => void;
        resolve: (value: CatalogRunResult) => void;
        keys: readonly string[];
        commandId?: string;
        signature: string;
      }
    >(),
  );
  const activeProbesAtom = atom(
    new Map<
      string,
      {
        promise: Promise<CatalogRunResult>;
        cancel: () => void;
        resolve: (value: CatalogRunResult) => void;
      }
    >(),
  );
  const scheduledReconciliationAtom = atom(
    undefined as
      | {
          generation: number;
          revision: number;
          targetId: string;
        }
      | undefined,
  );

  const operationContextAtom = selectAtom(
    settings.storage,
    ({ validation, revision, targetId }) =>
      validation.status === "valid"
        ? {
            status: "valid" as const,
            settings: validation.value,
            revision,
            targetId: targetId!,
          }
        : {
            status: "invalid" as const,
            errors: validation.errors,
            revision,
          },
    deepEqual,
  );

  const ensureHydratedAtom = atom(null, (get, set) => {
    if (get(hydratedAtom)) return;
    set(hydratedAtom, true);

    const storage =
      cacheStorage ??
      (typeof window === "undefined" ? undefined : window.localStorage);
    if (!storage) return;

    let source: ReturnType<typeof parseCatalogCache>;
    try {
      source = parseCatalogCache(storage.getItem(CACHE_KEY));
    } catch (error) {
      source = {
        classification: "malformed",
        images: [],
        diagnostic: { operation: "load", error },
      };
    }
    set(
      projectionAtom,
      catalogKernel.create(source, get(profileGenerationAtom)),
    );
  });

  const catalogRootAtom = atom(
    (get) => get(projectionAtom),
    (_get, set) => set(ensureHydratedAtom),
  );
  catalogRootAtom.onMount = (initialize) => {
    initialize();
  };

  const imagesAtom = selectAtom(catalogRootAtom, ({ images }) => images);

  const availablePrefixesAtom = atom((get) => {
    const prefixes = new Set(
      get(imagesAtom).flatMap((image) => {
        const parts = image.key.split("/");
        return parts
          .slice(0, -1)
          .map((_, index) => parts.slice(0, index + 1).join("/"));
      }),
    );
    return [...prefixes, ""]
      .map((prefix) => ({
        name: prefix,
        hierarchy: prefix.split("/").length - 1,
      }))
      .sort((left, right) => left.name.localeCompare(right.name));
  });

  const filteredImagesAtom = atom((get) => {
    const images = get(imagesAtom);
    const filter = get(filterAtom);
    const searched = filter.searchTerm
      ? new Fuse(images, { keys: ["key"], threshold: 0.3 })
          .search(filter.searchTerm)
          .map(({ item }) => item)
      : images;
    return searched
      .filter((image) => {
        if (
          filter.prefix !== undefined &&
          !image.key.startsWith(filter.prefix)
        ) {
          return false;
        }
        if (filter.prefix === "" && image.key.includes("/")) return false;
        const [from, to] = getTimeRange(filter.dateRangeType);
        if (
          from &&
          (!image.lastModified || isBefore(image.lastModified, from))
        ) {
          return false;
        }
        if (to && (!image.lastModified || isAfter(image.lastModified, to))) {
          return false;
        }
        return true;
      })
      .sort((left, right) => {
        if (filter.searchTerm) return 0;
        if (filter.sortBy === "key") {
          return filter.sortOrder === "asc"
            ? left.key.localeCompare(right.key)
            : right.key.localeCompare(left.key);
        }
        return filter.sortOrder === "asc"
          ? compareAsc(left.lastModified ?? "", right.lastModified ?? "")
          : compareDesc(left.lastModified ?? "", right.lastModified ?? "");
      });
  });

  const currentPageImagesAtom = atom((get) => {
    const size = get(pageSizeAtom);
    const start = (get(pageAtom) - 1) * size;
    return get(filteredImagesAtom).slice(start, start + size);
  });

  const targetUsableAtom = atom((get) => {
    const context = get(operationContextAtom);
    if (context.status === "invalid") return false;
    const projection = get(catalogRootAtom);
    if (
      projection.classification === "absent" ||
      projection.classification === "malformed"
    ) {
      return false;
    }
    return get(projectionMetaAtom).targetId === context.targetId;
  });

  const selectionValueAtom = selectAtom(
    atom((get) => {
      const keys = get(selectedKeysAtom);
      const currentPage = get(currentPageImagesAtom);
      const reservations = get(reservationsAtom);
      const usable = get(targetUsableAtom);
      const hasBusyKey = [...keys].some((key) => reservations.has(key));
      return {
        keys,
        count: keys.size,
        currentPageSelected:
          currentPage.length > 0 &&
          currentPage.every((image) => keys.has(image.key)),
        canDelete: usable && keys.size > 0 && !hasBusyKey,
        canRename: usable && keys.size === 1 && !hasBusyKey,
      };
    }),
    (value) => value,
    (left, right) =>
      setsEqual(left.keys, right.keys) &&
      left.currentPageSelected === right.currentPageSelected &&
      left.canDelete === right.canDelete &&
      left.canRename === right.canRename,
  );
  const selectionAtom = atom(
    (get) => get(selectionValueAtom),
    (get, set, input: z.input<typeof selectionActionSchema>) => {
      const action = selectionActionSchema.parse(input);
      const current = get(selectedKeysAtom);
      if (action.type === "clear") {
        if (current.size > 0) set(selectedKeysAtom, new Set());
        return;
      }
      if (action.type === "select-current-page") {
        const next = new Set(current);
        for (const image of get(currentPageImagesAtom)) next.add(image.key);
        if (!setsEqual(current, next)) set(selectedKeysAtom, next);
        return;
      }

      let next = new Set(current);
      if (
        (action.checked === "toggle" && current.has(action.key)) ||
        action.checked === false
      ) {
        next.delete(action.key);
      } else if (action.shift) {
        next = getShiftSelected(get(filteredImagesAtom), next, action.key);
      } else {
        next.add(action.key);
      }
      if (!setsEqual(current, next)) set(selectedKeysAtom, next);
    },
  );

  const publicProjectionAtom = selectAtom(
    catalogRootAtom,
    ({ classification, images, diagnostic }) => ({
      classification,
      images,
      diagnostic,
    }),
    (left, right) =>
      left.classification === right.classification &&
      left.images === right.images &&
      left.diagnostic === right.diagnostic,
  );
  const projectionStateAtom = selectAtom(
    atom((get) => {
      const projection = get(publicProjectionAtom);
      const meta = get(projectionMetaAtom);
      const usable = get(targetUsableAtom);
      const kind =
        projection.classification === "ready"
          ? ("ready" as const)
          : projection.classification === "cached-empty" ||
              projection.classification === "listed-empty"
            ? ("empty" as const)
            : ("unloaded" as const);

      return {
        kind,
        images: projection.images,
        usable,
        stale: meta.stale,
        cacheDiagnostic: projection.diagnostic,
      };
    }),
    (value) => value,
    (left, right) =>
      left.kind === right.kind &&
      left.images === right.images &&
      left.usable === right.usable &&
      left.stale === right.stale &&
      left.cacheDiagnostic === right.cacheDiagnostic,
  );

  const galleryStateAtom = atom((get) => {
    const images = get(imagesAtom);
    const filtered = get(filteredImagesAtom);
    const currentPage = get(currentPageImagesAtom);
    const pageSize = get(pageSizeAtom);

    return {
      availablePrefixes: get(availablePrefixesAtom),
      filteredImages: filtered,
      currentPageImages: currentPage,
      filteredCount: filtered.length,
      pageCount: Math.ceil(filtered.length / pageSize),
      empty:
        images.length === 0
          ? ("catalog-empty" as const)
          : filtered.length === 0
            ? ("filtered-empty" as const)
            : undefined,
    };
  });

  const backgroundRefreshInputAtom = atom((get) => {
    const meta = get(projectionMetaAtom);
    const context = get(operationContextAtom);
    const targetMatches =
      context.status === "valid" &&
      (meta.targetId === undefined || meta.targetId === context.targetId);
    const active = get(activeRefreshAtom);
    const scheduledReconciliation = get(scheduledReconciliationAtom);

    return {
      valid: context.status === "valid",
      revision: context.revision,
      targetId: context.status === "valid" ? context.targetId : undefined,
      generation: get(profileGenerationAtom),
      targetMatches,
      stale: meta.stale,
      autoRefresh: get(settings.gallery).autoRefresh,
      refreshAttempt: get(refreshAttemptAtom),
      activeGeneration: active?.generation,
      activeRevision: active?.revision,
      activeTargetId: active?.targetId,
      reconciliationPending:
        context.status === "valid" &&
        scheduledReconciliation?.generation === get(profileGenerationAtom) &&
        scheduledReconciliation.revision === context.revision &&
        scheduledReconciliation.targetId === context.targetId,
    };
  });
  const backgroundRefreshEligibilityAtom = selectAtom(
    backgroundRefreshInputAtom,
    (current, previous) => {
      const becameValid =
        previous !== undefined && !previous.valid && current.valid;
      const enabledAutoRefresh =
        previous !== undefined && !previous.autoRefresh && current.autoRefresh;
      let pending =
        previous?.pending ?? (current.stale && current.refreshAttempt === 0);
      if (current.reconciliationPending) pending = true;
      if ((becameValid || enabledAutoRefresh) && current.targetMatches) {
        pending = true;
      }

      const activeIsSuitable =
        current.valid &&
        current.activeGeneration === current.generation &&
        current.activeRevision === current.revision &&
        current.activeTargetId === current.targetId;
      if (
        activeIsSuitable ||
        (previous !== undefined &&
          previous.refreshAttempt !== current.refreshAttempt)
      ) {
        pending = false;
      }

      return {
        ...current,
        pending,
        eligible:
          pending &&
          current.valid &&
          (current.autoRefresh || current.reconciliationPending) &&
          current.targetMatches,
      };
    },
    deepEqual,
  );
  const backgroundRefreshEligibleAtom = selectAtom(
    backgroundRefreshEligibilityAtom,
    ({ eligible }) => eligible,
  );

  const stateAtom = atom((get) => {
    return {
      projection: get(projectionStateAtom),
      gallery: get(galleryStateAtom),
      refresh: get(refreshAtom),
      backgroundRefreshEligible: get(backgroundRefreshEligibleAtom),
    };
  });

  const persistProjectionAtom = atom(
    null,
    (get, set, operation: "persist" | "clear") => {
      const storage =
        cacheStorage ??
        (typeof window === "undefined" ? undefined : window.localStorage);
      if (!storage) return;
      try {
        storage.setItem(
          CACHE_KEY,
          operation === "clear"
            ? "[]"
            : serializeCatalogCache(get(projectionAtom).images),
        );
      } catch (error) {
        set(
          projectionAtom,
          catalogKernel.reduce(get(projectionAtom), {
            type: "cache-write-failed",
            operation,
            error,
          }),
        );
      }
    },
  );

  const stopOldActivityAtom = atom(null, (get, set) => {
    get(activeRefreshAtom)?.cancel();
    get(queuedRefreshAtom)?.resolve({ status: "superseded" });
    for (const mutation of get(activeMutationsAtom).values()) mutation.cancel();
    for (const probe of get(activeProbesAtom).values()) probe.cancel();
    set(activeRefreshAtom, undefined);
    set(queuedRefreshAtom, undefined);
    set(activeMutationsAtom, new Map());
    set(activeCommandsAtom, new Map());
    set(activeProbesAtom, new Map());
    set(reservationsAtom, new Set<string>());
    set(scheduledReconciliationAtom, undefined);
    set(refreshAtom, () => ({
      status: "idle",
      lastOutcome: undefined,
    }));
  });

  const run = atom(
    null,
    (
      get,
      set,
      input: z.input<typeof catalogCommandSchema>,
    ): Promise<CatalogRunResult> => {
      set(ensureHydratedAtom);
      const command = catalogCommandSchema.parse(input);

      if (command.type === "refresh") return refresh(command);
      if (command.type === "delete" || command.type === "rename") {
        return mutate(command);
      }
      return access(command);

      function currentContext() {
        return get(operationContextAtom);
      }

      function isCurrent(started: {
        generation: number;
        revision: number;
        targetId: string;
      }) {
        const context = currentContext();
        return (
          context.status === "valid" &&
          get(profileGenerationAtom) === started.generation &&
          context.revision === started.revision &&
          context.targetId === started.targetId
        );
      }

      function preflight() {
        const context = currentContext();
        if (context.status === "invalid") {
          return {
            ok: false as const,
            outcome: {
              status: "invalid-settings" as const,
              errors: context.errors,
            },
          };
        }
        const targetId = get(projectionMetaAtom).targetId;
        if (targetId !== context.targetId) {
          return {
            ok: false as const,
            outcome: { status: "target-mismatch" as const },
          };
        }
        return {
          ok: true as const,
          context: {
            settings: context.settings,
            revision: context.revision,
            targetId: context.targetId,
            generation: get(profileGenerationAtom),
          },
        };
      }

      function refresh(
        refreshCommand: Extract<
          z.infer<typeof catalogCommandSchema>,
          { type: "refresh" }
        >,
      ): Promise<CatalogRunResult> {
        const context = currentContext();
        if (context.status === "invalid") {
          return Promise.resolve({
            status: "invalid-settings" as const,
            errors: context.errors,
          });
        }
        const current = {
          generation: get(profileGenerationAtom),
          revision: context.revision,
          targetId: context.targetId,
        };
        const active = get(activeRefreshAtom);
        if (
          active &&
          active.generation === current.generation &&
          active.revision === current.revision &&
          active.targetId === current.targetId
        ) {
          if (
            refreshCommand.intent === "foreground" &&
            get(refreshAtom).status === "refreshing"
          ) {
            set(refreshAtom, (current) => ({
              ...current,
              status: "refreshing",
              intent: "foreground",
              reason: refreshCommand.reason,
            }));
          }
          return active.promise;
        }
        if (active) {
          const queued = get(queuedRefreshAtom);
          if (
            queued &&
            queued.generation === current.generation &&
            queued.revision === current.revision &&
            queued.targetId === current.targetId
          ) {
            if (
              refreshCommand.intent === "foreground" &&
              queued.command.intent === "background"
            ) {
              set(queuedRefreshAtom, {
                ...queued,
                command: refreshCommand,
              });
            }
            return queued.promise;
          }
          queued?.resolve({ status: "superseded" });
          const deferred = createDeferred<CatalogRunResult>();
          set(queuedRefreshAtom, {
            ...current,
            promise: deferred.promise,
            resolve: deferred.resolve,
            command: refreshCommand,
          });
          return deferred.promise;
        }
        const started = {
          settings: context.settings,
          ...current,
        };
        const listing = catalogKernel.beginListing(get(projectionAtom));
        const deferred = createDeferred<CatalogRunResult>();
        const record = {
          promise: deferred.promise,
          generation: started.generation,
          revision: started.revision,
          targetId: started.targetId,
          cancel: () => deferred.resolve({ status: "superseded" }),
          resolve: deferred.resolve,
        };
        const scheduledAtStart = get(scheduledReconciliationAtom);
        if (
          scheduledAtStart?.generation === started.generation &&
          scheduledAtStart.revision === started.revision &&
          scheduledAtStart.targetId === started.targetId
        ) {
          set(scheduledReconciliationAtom, undefined);
        }
        set(refreshAttemptAtom, (attempt) => attempt + 1);
        set(activeRefreshAtom, record);
        set(refreshAtom, (current) => ({
          status: "refreshing",
          intent: refreshCommand.intent,
          reason: refreshCommand.reason,
          lastOutcome: current.lastOutcome,
        }));

        void execute();
        return record.promise;

        async function execute() {
          let outcome: CatalogRunResult;
          try {
            const result = await createStorage(
              started.settings,
            ).listStoredImages();
            if (get(activeRefreshAtom) !== record) return;
            if (!isCurrent(started)) {
              outcome = { status: "superseded" };
            } else if (!result.ok) {
              outcome = { status: "refresh-failed", error: result.error };
            } else {
              let projection = catalogKernel.reduce(get(projectionAtom), {
                type: "listing-received",
                listing,
                images: result.value,
              });
              projection = catalogKernel.reduce(projection, {
                type: "prune-journal",
              });
              const scheduledReconciliation = get(scheduledReconciliationAtom);
              const requiresPostRefreshReconciliation =
                scheduledReconciliation?.generation === started.generation &&
                scheduledReconciliation.revision === started.revision &&
                scheduledReconciliation.targetId === started.targetId;
              set(projectionAtom, projection);
              set(projectionMetaAtom, {
                targetId: started.targetId,
                stale: requiresPostRefreshReconciliation,
              });
              set(persistProjectionAtom, "persist");
              outcome = { status: "refreshed", images: projection.images };
            }
          } catch (error) {
            if (get(activeRefreshAtom) !== record) return;
            outcome = isCurrent(started)
              ? { status: "refresh-failed", error }
              : { status: "superseded" };
          }
          finishRefresh(outcome);
        }

        function finishRefresh(outcome: CatalogRunResult) {
          if (get(activeRefreshAtom) !== record) return;
          set(activeRefreshAtom, undefined);
          set(refreshAtom, {
            status: "idle",
            lastOutcome:
              outcome.status === "superseded"
                ? get(refreshAtom).lastOutcome
                : outcome,
          });
          record.cancel = () => {};
          record.resolve(catalogRunResultSchema.parse(outcome));
          const queued = get(queuedRefreshAtom);
          if (queued) {
            queueMicrotask(() => {
              if (get(queuedRefreshAtom) !== queued) return;
              set(queuedRefreshAtom, undefined);
              const latest = currentContext();
              if (
                latest.status !== "valid" ||
                get(profileGenerationAtom) !== queued.generation ||
                latest.revision !== queued.revision ||
                latest.targetId !== queued.targetId
              ) {
                queued.resolve({ status: "superseded" });
                return;
              }
              if (
                get(scheduledReconciliationAtom)?.generation ===
                  queued.generation &&
                get(scheduledReconciliationAtom)?.revision ===
                  queued.revision &&
                get(scheduledReconciliationAtom)?.targetId === queued.targetId
              ) {
                set(scheduledReconciliationAtom, undefined);
              }
              void refresh(queued.command).then(queued.resolve);
            });
          }
          const scheduledReconciliation = get(scheduledReconciliationAtom);
          if (
            scheduledReconciliation &&
            get(profileGenerationAtom) === scheduledReconciliation.generation
          ) {
            queueMicrotask(() =>
              set(flushReconciliationAtom, scheduledReconciliation),
            );
          }
        }
      }

      function mutate(
        mutationCommand: Extract<
          z.infer<typeof catalogCommandSchema>,
          { type: "delete" | "rename" }
        >,
      ): Promise<CatalogRunResult> {
        const keys =
          mutationCommand.type === "delete"
            ? [...new Set(mutationCommand.keys)].sort()
            : [
                ...new Set([mutationCommand.oldKey, mutationCommand.newKey]),
              ].sort();
        const signature = JSON.stringify(
          mutationCommand.type === "delete"
            ? [mutationCommand.type, keys]
            : [
                mutationCommand.type,
                mutationCommand.oldKey,
                mutationCommand.newKey,
                mutationCommand.overwrite ?? false,
              ],
        );
        if (mutationCommand.commandId) {
          const existing = get(activeCommandsAtom).get(
            mutationCommand.commandId,
          );
          if (existing) {
            return existing.signature === signature
              ? existing.promise
              : Promise.resolve({
                  status: "command-id-conflict" as const,
                  commandId: mutationCommand.commandId,
                });
          }
        }

        const checked = preflight();
        if (!checked.ok) return Promise.resolve(checked.outcome);
        const context = checked.context;
        const conflicts = keys.filter((key) => get(reservationsAtom).has(key));
        if (conflicts.length > 0) {
          return Promise.resolve({
            status: "keys-busy" as const,
            keys: conflicts,
          });
        }

        const token = get(nextOperationAtom) + 1;
        set(nextOperationAtom, token);
        const deferred = createDeferred<CatalogRunResult>();
        const record = {
          token,
          promise: deferred.promise,
          cancel: () => deferred.resolve({ status: "superseded" }),
          resolve: deferred.resolve,
          keys,
          commandId: mutationCommand.commandId,
          signature,
        };
        set(reservationsAtom, (current) => new Set([...current, ...keys]));
        set(activeMutationsAtom, (current) =>
          new Map(current).set(token, record),
        );
        if (mutationCommand.commandId) {
          set(activeCommandsAtom, (current) =>
            new Map(current).set(mutationCommand.commandId!, record),
          );
        }

        void executeMutation();
        return record.promise;

        async function executeMutation() {
          let outcome: CatalogRunResult;
          try {
            const storage = createStorage(context.settings);
            if (mutationCommand.type === "delete") {
              const result = await storage.deleteStoredImages(keys);
              if (!get(activeMutationsAtom).has(token)) return;
              if (!isCurrent(context)) {
                outcome = { status: "superseded" };
              } else if (result.ok) {
                set(
                  projectionAtom,
                  catalogKernel.reduce(get(projectionAtom), {
                    type: "delete-confirmed",
                    operationId: `delete-${token}`,
                    deletedKeys: result.value.deletedKeys,
                  }),
                );
                clearSelected(keys);
                set(projectionMetaAtom, (current) => ({
                  ...current,
                  stale: true,
                }));
                set(persistProjectionAtom, "persist");
                set(scheduleReconciliationAtom);
                outcome = {
                  status: "deleted",
                  deletedKeys: result.value.deletedKeys,
                };
              } else {
                clearSelected(keys);
                set(projectionMetaAtom, (current) => ({
                  ...current,
                  stale: true,
                }));
                set(scheduleReconciliationAtom, "after-active-refresh");
                outcome = { status: "delete-failed", error: result.error };
              }
            } else {
              const result = await storage.renameStoredImage({
                oldKey: mutationCommand.oldKey,
                newKey: mutationCommand.newKey,
                overwrite: mutationCommand.overwrite,
              });
              if (!get(activeMutationsAtom).has(token)) return;
              if (!isCurrent(context)) {
                outcome = { status: "superseded" };
              } else if (result.ok) {
                const oldImage = get(imagesAtom).find(
                  (image) => image.key === mutationCommand.oldKey,
                );
                const newImage = {
                  ...oldImage,
                  key: result.value.newKey,
                };
                set(
                  projectionAtom,
                  catalogKernel.reduce(get(projectionAtom), {
                    type: "rename-confirmed",
                    operationId: `rename-${token}`,
                    oldKey: result.value.oldKey,
                    newImage,
                  }),
                );
                remapSelected(result.value.oldKey, result.value.newKey);
                set(projectionMetaAtom, (current) => ({
                  ...current,
                  stale: true,
                }));
                set(persistProjectionAtom, "persist");
                set(scheduleReconciliationAtom);
                outcome = {
                  status: "renamed",
                  oldKey: result.value.oldKey,
                  newKey: result.value.newKey,
                };
              } else if (result.error.reason === "already-exists") {
                outcome = { status: "already-exists", key: result.error.key };
              } else if (result.error.reason === "partial-rename") {
                set(projectionMetaAtom, (current) => ({
                  ...current,
                  stale: true,
                }));
                set(scheduleReconciliationAtom, "after-active-refresh");
                outcome = {
                  status: "partial-rename",
                  copiedKey: result.error.copiedKey,
                  failedDeleteKey: result.error.failedDeleteKey,
                };
              } else {
                set(projectionMetaAtom, (current) => ({
                  ...current,
                  stale: true,
                }));
                set(scheduleReconciliationAtom, "after-active-refresh");
                outcome = { status: "rename-failed", error: result.error };
              }
            }
          } catch (error) {
            if (!get(activeMutationsAtom).has(token)) return;
            if (!isCurrent(context)) {
              outcome = { status: "superseded" };
            } else if (mutationCommand.type === "delete") {
              clearSelected(keys);
              set(projectionMetaAtom, (current) => ({
                ...current,
                stale: true,
              }));
              set(scheduleReconciliationAtom, "after-active-refresh");
              outcome = { status: "delete-failed", error };
            } else {
              set(projectionMetaAtom, (current) => ({
                ...current,
                stale: true,
              }));
              set(scheduleReconciliationAtom, "after-active-refresh");
              outcome = { status: "rename-failed", error };
            }
          }
          finishMutation(outcome);
        }

        function finishMutation(outcome: CatalogRunResult) {
          if (get(activeMutationsAtom).get(record.token) !== record) return;
          set(activeMutationsAtom, (current) => {
            const next = new Map(current);
            next.delete(record.token);
            return next;
          });
          if (record.commandId) {
            set(activeCommandsAtom, (current) => {
              if (current.get(record.commandId!) !== record) return current;
              const next = new Map(current);
              next.delete(record.commandId!);
              return next;
            });
          }
          set(reservationsAtom, (current) => {
            const next = new Set(current);
            for (const key of record.keys) next.delete(key);
            return next;
          });
          record.resolve(catalogRunResultSchema.parse(outcome));
        }
      }

      function access(
        accessCommand: Extract<
          z.infer<typeof catalogCommandSchema>,
          { type: "access" }
        >,
      ): Promise<CatalogRunResult> {
        const checked = preflight();
        if (!checked.ok) return Promise.resolve(checked.outcome);
        const context = checked.context;
        const source = s3Key2Url(accessCommand.key, context.settings);
        if (accessCommand.purpose === "url") {
          return Promise.resolve({
            status: "accessed" as const,
            purpose: "url" as const,
            value: source,
          });
        }
        if (accessCommand.purpose === "markdown") {
          return Promise.resolve({
            status: "accessed" as const,
            purpose: "markdown" as const,
            value: `![${accessCommand.key}](${source})`,
          });
        }
        if (accessCommand.purpose === "probe") {
          const signature = JSON.stringify([
            accessCommand.key,
            context.generation,
            context.revision,
          ]);
          const existing = get(activeProbesAtom).get(signature);
          if (existing) return existing.promise;
          const deferred = createDeferred<CatalogRunResult>();
          const record = {
            promise: deferred.promise,
            cancel: () => deferred.resolve({ status: "superseded" }),
            resolve: deferred.resolve,
          };
          set(activeProbesAtom, (current) =>
            new Map(current).set(signature, record),
          );
          void executeProbe();
          return record.promise;

          async function executeProbe() {
            let outcome: CatalogRunResult;
            try {
              const result = await createStorage(
                context.settings,
              ).probeStoredImage(accessCommand.key);
              if (get(activeProbesAtom).get(signature) !== record) return;
              outcome = !isCurrent(context)
                ? { status: "superseded" }
                : result.ok
                  ? {
                      status: "accessed",
                      purpose: "probe",
                      value: result.value,
                    }
                  : {
                      status: "access-failed",
                      purpose: "probe",
                      error: result.error,
                    };
            } catch (error) {
              if (get(activeProbesAtom).get(signature) !== record) return;
              outcome = isCurrent(context)
                ? { status: "access-failed", purpose: "probe", error }
                : { status: "superseded" };
            }
            set(activeProbesAtom, (current) => {
              if (current.get(signature) !== record) return current;
              const next = new Map(current);
              next.delete(signature);
              return next;
            });
            record.resolve(catalogRunResultSchema.parse(outcome));
          }
        }

        return executeDownload();

        async function executeDownload(): Promise<CatalogRunResult> {
          try {
            const result = await createStorage(
              context.settings,
            ).downloadStoredImage(accessCommand.key);
            if (!isCurrent(context)) return { status: "superseded" };
            return result.ok
              ? {
                  status: "accessed",
                  purpose: "download",
                  value: result.value,
                }
              : {
                  status: "access-failed",
                  purpose: "download",
                  error: result.error,
                };
          } catch (error) {
            return isCurrent(context)
              ? { status: "access-failed", purpose: "download", error }
              : { status: "superseded" };
          }
        }
      }

      function clearSelected(keys: readonly string[]) {
        const current = get(selectedKeysAtom);
        const next = new Set(current);
        for (const key of keys) next.delete(key);
        if (!setsEqual(current, next)) set(selectedKeysAtom, next);
      }

      function remapSelected(oldKey: string, newKey: string) {
        const current = get(selectedKeysAtom);
        if (!current.has(oldKey)) return;
        const next = new Set(current);
        next.delete(oldKey);
        next.add(newKey);
        set(selectedKeysAtom, next);
      }
    },
  );

  const flushReconciliationAtom = atom(
    null,
    (
      get,
      set,
      scheduled: { generation: number; revision: number; targetId: string },
    ) => {
      if (
        get(scheduledReconciliationAtom) !== scheduled ||
        get(profileGenerationAtom) !== scheduled.generation
      ) {
        return;
      }
      const context = get(operationContextAtom);
      if (context.status === "invalid") return;
      if (
        context.revision !== scheduled.revision ||
        context.targetId !== scheduled.targetId
      ) {
        set(scheduledReconciliationAtom, undefined);
        return;
      }
      set(scheduledReconciliationAtom, undefined);
      void set(run, {
        type: "refresh",
        intent: "background",
        reason: "reconciliation",
      });
    },
  );

  const scheduleReconciliationAtom = atom(
    null,
    (get, set, requirement?: "after-active-refresh") => {
      const generation = get(profileGenerationAtom);
      const context = get(operationContextAtom);
      if (context.status === "invalid") return false;
      const scheduled = {
        generation,
        revision: context.revision,
        targetId: context.targetId,
      };
      const active = get(activeRefreshAtom);
      if (active) {
        const activeIsSuitable =
          active.generation === generation &&
          active.revision === context.revision &&
          active.targetId === context.targetId;
        if (requirement === "after-active-refresh" || !activeIsSuitable) {
          set(scheduledReconciliationAtom, scheduled);
        }
        return false;
      }
      const existing = get(scheduledReconciliationAtom);
      if (
        existing?.generation === generation &&
        existing.revision === context.revision &&
        existing.targetId === context.targetId
      ) {
        return false;
      }
      set(scheduledReconciliationAtom, scheduled);
      queueMicrotask(() => set(flushReconciliationAtom, scheduled));
      return true;
    },
  );

  const integrate = atom(
    null,
    (get, set, input: z.input<typeof catalogIntegrationSchema>) => {
      set(ensureHydratedAtom);
      const fact = catalogIntegrationSchema.parse(input);
      if (fact.type === "profile-replaced") {
        set(stopOldActivityAtom);
        set(
          projectionAtom,
          catalogKernel.reduce(get(projectionAtom), {
            type: "generation-reset",
            generation: get(profileGenerationAtom),
          }),
        );
        set(projectionMetaAtom, { targetId: undefined, stale: true });
        set(selectedKeysAtom, new Set());
        set(filterAtom, galleryFilterDefault);
        set(pageAtom, 1);
        set(pageSizeAtom, galleryPageSizeDefault);
        set(persistProjectionAtom, "clear");
        const context = get(operationContextAtom);
        if (context.status === "valid" && get(settings.gallery).autoRefresh) {
          set(scheduleReconciliationAtom);
        }
        return { status: "profile-replaced" as const };
      }

      const context = get(operationContextAtom);
      if (
        context.status === "invalid" ||
        fact.generation !== get(profileGenerationAtom) ||
        fact.storageRevision !== context.revision
      ) {
        return { status: "stale" as const };
      }
      const current = get(projectionAtom);
      const targetId = get(projectionMetaAtom).targetId;
      if (targetId !== undefined && targetId !== context.targetId) {
        return { status: "target-unsafe" as const };
      }
      const projectionIsUnloaded =
        current.classification === "absent" ||
        current.classification === "malformed";
      const next = catalogKernel.reduce(current, fact);
      if (next === current) return { status: "duplicate" as const };
      set(projectionAtom, next);
      // A confirmed PUT proves this image belongs to the current target, but it
      // does not prove that the existing listing does. Retain that listing's
      // old/unknown binding until a list binds it while keeping the confirmed
      // fact immediately in the projection/journal.
      set(projectionMetaAtom, {
        targetId:
          targetId === undefined && projectionIsUnloaded
            ? context.targetId
            : targetId,
        stale: true,
      });
      set(persistProjectionAtom, "persist");
      set(scheduleReconciliationAtom);
      return { status: "accepted" as const, image: fact.image };
    },
  );

  function item(key: string) {
    const hasImageAtom = selectAtom(imagesAtom, (images) =>
      images.some((candidate) => candidate.key === key),
    );
    const accessAtom = atom((get) => {
      const context = get(operationContextAtom);
      if (
        !get(hasImageAtom) ||
        !get(targetUsableAtom) ||
        context.status !== "valid"
      ) {
        return undefined;
      }
      return { source: s3Key2Url(key, context.settings) };
    });
    const itemAtom = atom((get) => {
      return {
        selected: get(selectedKeysAtom).has(key),
        reserved: get(reservationsAtom).has(key),
        access: get(accessAtom),
      };
    });
    return selectAtom(
      itemAtom,
      (value) => value,
      (left, right) =>
        left.selected === right.selected &&
        left.reserved === right.reserved &&
        left.access === right.access,
    );
  }

  return {
    state: stateAtom,
    view: {
      filter: filterAtom,
      page: pageAtom,
      pageSize: pageSizeAtom,
      selection: selectionAtom,
    },
    item,
    run,
    integrate,
  };
}

const catalogRunResultSchema = z.union([
  z.object({
    status: z.literal("refreshed"),
    images: z.array(storedImageSchema),
  }),
  z.object({ status: z.literal("refresh-failed"), error: z.unknown() }),
  z.object({
    status: z.literal("deleted"),
    deletedKeys: z.array(storageKeySchema),
  }),
  z.object({ status: z.literal("delete-failed"), error: z.unknown() }),
  z.object({
    status: z.literal("renamed"),
    oldKey: storageKeySchema,
    newKey: storageKeySchema,
  }),
  z.object({ status: z.literal("rename-failed"), error: z.unknown() }),
  z.object({ status: z.literal("already-exists"), key: storageKeySchema }),
  z.object({
    status: z.literal("partial-rename"),
    copiedKey: storageKeySchema,
    failedDeleteKey: storageKeySchema,
  }),
  z.object({ status: z.literal("invalid-settings"), errors: z.unknown() }),
  z.object({ status: z.literal("target-mismatch") }),
  z.object({ status: z.literal("keys-busy"), keys: z.array(storageKeySchema) }),
  z.object({
    status: z.literal("command-id-conflict"),
    commandId: z.string(),
  }),
  z.object({ status: z.literal("superseded") }),
  z.object({
    status: z.literal("accessed"),
    purpose: z.literal("probe"),
    value: storedImageMetadataSchema,
  }),
  z.object({
    status: z.literal("accessed"),
    purpose: z.literal("download"),
    value: storedImageDownloadSchema,
  }),
  z.object({
    status: z.literal("accessed"),
    purpose: z.enum(["url", "markdown"]),
    value: z.string(),
  }),
  z.object({
    status: z.literal("access-failed"),
    purpose: z.enum(["probe", "download"]),
    error: z.unknown(),
  }),
]);
type CatalogRunResult = z.infer<typeof catalogRunResultSchema>;

export const imageCatalog = createImageCatalog();

function setsEqual(left: ReadonlySet<string>, right: ReadonlySet<string>) {
  return left.size === right.size && [...left].every((key) => right.has(key));
}

function getShiftSelected(
  images: readonly z.infer<typeof storedImageSchema>[],
  current: Set<string>,
  key: string,
) {
  const lastSelected = [...current].pop();
  if (!lastSelected) return new Set([key]);
  const lastIndex = images.findIndex((image) => image.key === lastSelected);
  const currentIndex = images.findIndex((image) => image.key === key);
  if (lastIndex === -1 || currentIndex === -1) return current;
  const next = new Set(current);
  for (
    let index = Math.min(lastIndex, currentIndex);
    index <= Math.max(lastIndex, currentIndex);
    index++
  ) {
    next.add(images[index].key);
  }
  return next;
}

function getTimeRange(
  value: z.infer<typeof galleryFilterSchema>["dateRangeType"],
) {
  if (Array.isArray(value)) return value;
  const selected = timeRangesGetter().find(({ type }) => type === value);
  return selected
    ? ([sub(new Date(), selected.duration), new Date()] as const)
    : ([null, null] as const);
}
