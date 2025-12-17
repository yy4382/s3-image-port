import type { Photo } from "@/stores/schemas/photo";
import { enableMapSet, produce } from "immer";
import { atom } from "jotai";
import { filteredPhotosAtom } from "./use-photo-list";
import { selectedPhotosAtom } from "@/stores/atoms/gallery";

enableMapSet();

export const toggleSelectedAtom = atom(
  null,
  (get, set, key: string, check: boolean | "toggle", shift: boolean) => {
    const oldSet = get(selectedPhotosAtom);
    let newSet = new Set(oldSet);
    if ((check === "toggle" && oldSet.has(key)) || check === false) {
      newSet.delete(key);
    } else {
      if (shift) {
        newSet = getShiftSelected(get(filteredPhotosAtom), newSet, key);
      } else {
        newSet.add(key);
      }
    }
    set(selectedPhotosAtom, newSet);
  },
);

const getShiftSelected = (
  photoList: readonly Photo[],
  currentSelected: Set<string>,
  key: string,
) => {
  const lastSelected = [...currentSelected].pop();
  if (!lastSelected) {
    return new Set([key]);
  }
  const lastSelectedIndex = photoList.findIndex((p) => p.Key === lastSelected);
  const currentSelectingIndex = photoList.findIndex((p) => p.Key === key);
  if (lastSelectedIndex === -1 || currentSelectingIndex === -1) {
    return currentSelected;
  }
  const startIndex = Math.min(lastSelectedIndex, currentSelectingIndex);
  const endIndex = Math.max(lastSelectedIndex, currentSelectingIndex);
  const newSet = produce(currentSelected, (draft) => {
    for (let i = startIndex; i <= endIndex; i++) {
      draft.add(photoList[i].Key);
    }
  });
  return newSet;
};
