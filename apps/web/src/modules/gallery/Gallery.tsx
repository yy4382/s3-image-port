"use client";

import { PhotoGrid } from "./GalleryContent/PhotoGrid";
import { GalleryControl } from "./GalleryControl/GalleryControl";
import { ClientOnly } from "@tanstack/react-router";
import { useEffect } from "react";
import { useAtomValue, useSetAtom } from "jotai";
import { selectAtom } from "jotai/utils";
import { imageCatalog } from "@/modules/image-catalog";

const shouldRunAutoRefreshAtom = selectAtom(
  imageCatalog.state,
  ({ backgroundRefreshEligible }) => backgroundRefreshEligible,
);

export function Gallery() {
  const runCatalog = useSetAtom(imageCatalog.run);
  const shouldRunAutoRefresh = useAtomValue(shouldRunAutoRefreshAtom);

  useEffect(() => {
    if (shouldRunAutoRefresh) {
      void runCatalog({
        type: "refresh",
        intent: "background",
        reason: "startup",
      });
    }
  }, [runCatalog, shouldRunAutoRefresh]);

  return (
    <div className="flex flex-col gap-6 w-full">
      <GalleryControl />
      <ClientOnly>
        <PhotoGrid />
      </ClientOnly>
    </div>
  );
}
