# Design the deep settings interface

Type: grilling
Status: resolved
Blocked by: 03

## Question

What single deep interface should the Jotai settings module present so callers can read stable projections and perform settings-profile operations without learning many similar selectors, thin wrappers, storage-envelope details, or parsing rules?

Preserve the existing storage key, versioned envelope, migrations, defaults, ordering, active-index behavior, import/export/sync format, typed operation outcomes, and ordinary-edit versus profile-replacement semantics. Cover raw storage fields, normalized validity/errors, validated storage settings, upload settings, gallery settings, sync-format settings, profile operations, access-test state, and the one profile-replacement signal used for cross-module effects.

The design must:

- evolve existing Jotai atoms instead of replacing them wholesale;
- keep structurally equal projection updates as semantic no-ops and preserve reference identity across unrelated changes;
- read current settings at command time without parsed settings objects in React events or effect dependencies;
- use Zod-inferred core data structures and contextual inference instead of a type-first inventory;
- avoid a forest of one-selector hooks, pass-through commands, or more than five similar same-purpose interaction points without redesigning the interface for greater depth.

Resolve the interface at the level needed for callers and tests, not a list of implementation files or standalone types.

## Comments

- The user explicitly delegated this design decision to the agent and instructed it not to run a HITL grilling exchange. Resolve autonomously from the accepted map decisions and repository evidence.

## Answer

Present one `settings` module value containing five pre-created Jotai atoms and no hooks, selector barrel, command facade, provider, lifecycle object, or exported persistence adapter:

```ts
settings.profiles;
settings.storage;
settings.upload;
settings.gallery;
settings.replaceProfile;
```

These are the interface. They are not wrappers around another public interface. The implementation may retain as many private atoms and pure functions as it needs, but callers and contract tests use only these five atoms through the normal Jotai store or hooks.

The production module exports one singleton created with the real browser storage, `createStorage`, and origin reader. Deterministic tests construct the same five-atom interface with injected storage, `createStorage`, and origin adapters. Construction is the real adapter seam, not a React context or runtime container; after construction there are no dependency setters or lifecycle methods. Let TypeScript infer the module shape from the construction function, and add a `ReturnType` alias only if a real cross-module seam eventually requires one.

### The five interaction points

1. **`settings.profiles` — settings-profile projection and ordinary operations.** Its read value is a small object with two independently stable Zod-derived values: the persisted profiles envelope and its sync-format projection. Its write side accepts the ordinary settings-profile operations: rename, duplicate, delete, single-profile import, and export. Parsing, v1/current import handling, unique-copy naming, duplicate-name checks, active-profile deletion rejection, ordering, and serialization stay behind this atom. It returns discriminated outcomes such as `renamed`, `same-name`, `name-exists`, `not-found`, `duplicated`, `active-profile`, `imported`, or `invalid`; it never toasts, reads the clipboard, or touches React. Clipboard/file IO and outcome-to-message translation remain UI concerns.

   The sync-format value keeps the existing version and payload shape and omits `current`. Its reference remains unchanged when only the active index changes or when a structurally equal profile envelope is written. The retained sync workflow reads this value and does not learn the storage envelope or migration rules. If a React sync consumer needs only this nested value, it may define one module-scope `selectAtom` for that consumer; the settings module must not publish a selector or hook family.

2. **`settings.storage` — raw edit state, validation, storage identity, and access testing.** Its read value has the following semantic shape, inferred from the existing Zod schemas and the implementation rather than declared as a large standalone type inventory:

   ```ts
   {
     raw,
     validation: { status: "valid", value } |
                 { status: "invalid", errors },
     revision,
     targetId,
     access
   }
   ```

   `raw` is the editable storage section. The valid branch contains the canonical parsed storage settings; the invalid branch contains normalized field errors. `revision` changes only when the semantic validated-storage projection changes, including valid/invalid transitions. `targetId` is derived only from endpoint, bucket, and include path. `access` preserves `idle`, `testing`, `success`, `failed`, and `cors-incomplete`, including allowed and missing methods.

   Its write side has two behaviors: apply a raw edit/update, or test access. A structurally equal edit returns an unchanged outcome and preserves every reference and the persisted envelope. Access testing validates the current raw value when invoked; invalid settings return `invalid-settings` with zero adapter construction and zero remote IO. A valid invocation constructs the injected storage adapter at that moment, records a private per-Jotai-store request token and storage revision, and only publishes completion if both are still current. A storage revision change resets visible access state to idle; upload, gallery, sync metadata, and inactive-profile changes do not. A superseded or old-store completion may resolve to its caller but cannot change the current visible state. This needs private atoms, not a public `dispose()` method.

   Catalog, upload, probe, and download owners read the valid branch and revision with `get(settings.storage)` when their IO starts. React does not put parsed settings into events, callbacks, or effect dependencies and does not construct storage adapters.

3. **`settings.upload` — the existing focused upload-settings atom.** Preserve its current Zod-derived value and `SetStateAction` behavior, including key-template presets and compression options. Add the semantic-equality guard at the owning profile update so an equal update is a no-op. This atom should be the existing focused Jotai path evolved in place, not a new pass-through atom.

4. **`settings.gallery` — the existing focused gallery-settings atom.** Preserve the current auto-refresh projection and write behavior, again with semantic no-op handling. It does not own gallery URL state, catalog dirtying, or refresh IO. Ordinary gallery-setting edits do not replace the active settings profile or clear catalog/cache state.

5. **`settings.replaceProfile` — the settings-only half of profile replacement.** This write-only atom accepts the three genuine replacement inputs: activate a named settings profile, apply a sync-format profiles replacement, or apply an imported full profiles envelope. It validates/migrates input, preserves the existing active-name-then-index-then-zero selection rule, writes settings at most once, and returns a typed result containing whether anything changed and whether the active settings profile was genuinely replaced, plus previous/next active names when relevant.

   This atom never imports the image catalog, natural-size cache, or profile generation. The already accepted external composition write atom is its sole production caller for replacement-capable actions: it calls `settings.replaceProfile`, and only when the returned `profileReplaced` flag is true does it advance profile generation, reset the catalog, and clear the natural-size cache exactly once. An already-active load, structurally equal sync/import, rename, duplicate, inactive import/edit, metadata-only rename, and ordinary field edit all return or imply `profileReplaced: false` and cause no cross-module reset.

### Persistence and projection rules hidden behind the interface

- Keep `s3ip:profiles-list`, the current versioned envelope, defaults, v2-to-v3 migration and cleanup, corruption fallback, function updates, ordering, and active-index rules behind one private `atomWithStorageMigration` root. Do not replace it with a custom store, provider, or persistence object.
- Keep the base `optionsAtom` and focused Jotai graph as private implementation where useful. `settings.upload` and `settings.gallery` should be the existing atom instances or direct evolutions of them. Consolidating the public interface must not introduce duplicate state or copy values through synchronization effects.
- Reject a write before touching the persisted root when its resolved next value is structurally equal. Persistence then happens only for a real profiles-envelope change.
- Memoize/reuse the storage validation branches, normalized errors, parsed storage value, sync-format value, upload value, and gallery value independently. An unrelated update preserves `===` identity for every unaffected projection. Atoms are created once at module construction, never in render.
- Core persisted values continue to come from `storedSettingsSchema`, `optionsSchema`, and `settingsForSyncSchema`. Profile/access commands may have small explicit discriminated inputs and outcomes because they are genuine seams; do not recreate the rejected file's preliminary inventory of aliases, selectors, snapshots, commands, lifecycle types, and store interfaces.

### Caller and test shape

Typical non-React use is direct and command-time:

```ts
const storage = get(settings.storage);
if (storage.validation.status !== "valid") return invalidSettings;

const outcome = set(settings.replaceProfile, {
  type: "apply-sync",
  update,
});
if (outcome.profileReplaced) {
  set(profileGenerationAtom, (generation) => generation + 1);
  set(imageCatalog.integrate, { type: "profile-replaced" });
  set(naturalSizes.clear);
}
```

React uses `useAtom`, `useAtomValue`, or `useSetAtom` on these same atoms. There is no `useSettingsSelector`, `useSettingsCommands`, settings context, or compatibility hook layer. Tests create a vanilla Jotai store and exercise the same five interaction points, asserting observable values, returned outcomes, reference identity, persistence writes, and adapter call counts rather than private atoms.

Retain and extend the base persistence/migration/profile UI tests. Translate the useful rejected-store scenarios into interface tests for structural no-ops, independent projection identity, current-index preservation, typed operation rejections, command-time settings, invalid-settings no-IO, access CORS/failure detail, revision invalidation, stale completion, and exact replacement classification. Do not port snapshot selectors, command-facade identity tests, store activation/disposal tests, or the reduced replacement UI suites.

### Incremental adoption boundary

Adopt this without a reactive rewrite. First build the five-atom interface around the existing storage root and focused atoms, then switch the profile utilities, storage form/access UI, and retained sync workflow to the behavior-rich atoms. Move catalog/upload/storage operations to command-time `get(settings.storage)` as their owning modules are implemented. Update imports mechanically without changing the existing gallery/router effects or unrelated Jotai derivations. Once all callers use `settings`, make the old `optionsAtom`, `s3SettingsAtom`, `validS3SettingsAtom`, `settingsForSyncAtom`, and direct profiles setter private; do not keep alias exports, adapter hooks, or temporary pass-through facades.

The mounted form's response to an external active-profile replacement remains a React reactivity characterization for **Define the reactivity preservation contract**, not a reason to widen this settings interface or rewrite the form here. No new domain term is needed in `CONTEXT.md`.
