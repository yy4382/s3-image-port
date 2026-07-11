import { atom } from "jotai";

import { imageCatalog } from "@/modules/image-catalog";
import { profileGenerationAtom } from "@/modules/settings/profile-generation";
import { clearNaturalSizeCacheAtom } from "@/stores/atoms/photo-size";
import {
  settings,
  type SettingsProfileReplacement,
} from "@/stores/atoms/settings";

export const replaceSettingsProfileAtom = atom(
  null,
  (_get, set, replacement: SettingsProfileReplacement) => {
    const outcome = set(settings.replaceProfile, replacement);
    if (outcome.profileReplaced) {
      set(profileGenerationAtom, (generation) => generation + 1);
      set(imageCatalog.integrate, { type: "profile-replaced" });
      set(clearNaturalSizeCacheAtom);
    }
    return outcome;
  },
);
