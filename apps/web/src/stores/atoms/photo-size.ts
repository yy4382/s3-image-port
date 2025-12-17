import { z } from "zod";
import { LRUCache } from "lru-cache";
import { debounce } from "es-toolkit/function";
import { atom } from "jotai";

/**
 * LRU cache for storing natural image dimensions (width × height) to avoid re-calculating
 * layout dimensions. Maximum of 1000 entries, automatically evicting least recently used items.
 */
const naturalSizeCache = new LRUCache<string, [number, number]>({
  max: 300,
  allowStale: true,
});

/**
 * Internal notification atom that triggers re-evaluation of naturalSizesAtom when cache is modified.
 * The boolean value itself is meaningless - it just toggles to signal updates.
 */
const naturalSizeDirtyNotificationAtom = atom(false);

/**
 * Atom providing access to the natural image size cache with reactivity.
 * Returns a tuple of [cache, dirtyFlag] where dirtyFlag ensures components re-render when cache changes.
 *
 * Usage: `const [sizeCache] = useAtomValue(naturalSizesAtom); const size = sizeCache.get(photoKey);`
 */
export const naturalSizesAtom = atom((get) => {
  return [naturalSizeCache, get(naturalSizeDirtyNotificationAtom)] as const;
});

// sync with localStorage
const localStorageKey = "s3ip:gallery:naturalSizeCache";
naturalSizeDirtyNotificationAtom.onMount = () => {
  // the `naturalSizeDirtyNotificationAtom` is always mounted when `naturalSizesAtom` is mounted
  // so we can use its onMount to sync with localStorage
  function getDump() {
    const dump = localStorage.getItem(localStorageKey);
    if (!dump) {
      return [];
    }
    const validated = z
      .array(z.tuple([z.string(), z.tuple([z.number(), z.number()])]))
      .safeParse(JSON.parse(dump));
    if (!validated.success) {
      return [];
    }
    return validated.data.map(
      (entry) =>
        [entry[0], { value: entry[1] }] as [
          string,
          { value: [number, number] },
        ],
    );
  }
  const dump = getDump();
  naturalSizeCache.load(dump);

  return () => {
    // this onUnmount call doesn't seems to work,
    // maybe it took too long for a unmount to happen, but i'll leave it here for now
    dumpNaturalSizeCacheToLocalStorage();
  };
};

function dumpNaturalSizeCacheToLocalStorage() {
  const dump = naturalSizeCache
    .dump()
    .map((entry) => [entry[0], entry[1].value] as const);
  localStorage.setItem(localStorageKey, JSON.stringify(dump));
}

const dumpNaturalSizeCacheToLocalStorageDebounced = debounce(
  dumpNaturalSizeCacheToLocalStorage,
  1000,
);

export const setNaturalSizesAtom = atom(
  null,
  (get, set, inputAction: [string, [number, number]]) => {
    const validated = z
      .tuple([z.string(), z.tuple([z.number(), z.number()])])
      .safeParse(inputAction);
    if (!validated.success) {
      return;
    }
    const action = validated.data;
    const map = get(naturalSizesAtom)[0];
    const old = map.get(action[0]);
    if (old && old[0] === action[1][0] && old[1] === action[1][1]) {
      return;
    }
    map.set(action[0], action[1]);
    set(naturalSizeDirtyNotificationAtom, (prev) => !prev); // trigger a re-evaluation
    dumpNaturalSizeCacheToLocalStorageDebounced();
  },
);

export const clearNaturalSizeCacheAtom = atom(null, (_, set) => {
  naturalSizeCache.clear();
  set(naturalSizeDirtyNotificationAtom, (prev) => !prev);
  dumpNaturalSizeCacheToLocalStorageDebounced();
});
