"use client";

import { useFetchPhotoList } from "./galleryStore";
import { PhotoGrid } from "./GalleryContent/PhotoGrid";
import { GalleryControl } from "./GalleryControl/GalleryControl";
import { ClientOnly } from "@/components/misc/client-only";
import { useEffect } from "react";
import {
  gallerySettingsAtom,
  validS3SettingsAtom,
} from "../settings/settingsStore";
import { atom, useAtomValue } from "jotai";

const shouldRunAutoRefreshAtom = atom((get) => {
  const gallerySettings = get(gallerySettingsAtom);
  if (!gallerySettings.autoRefresh) {
    return false;
  }
  const s3Settings = get(validS3SettingsAtom);
  if (!s3Settings) {
    return false;
  }
  return true;
});

export function Gallery() {
  const listPhotos = useFetchPhotoList();
  const shouldRunAutoRefresh = useAtomValue(shouldRunAutoRefreshAtom);

  useEffect(() => {
    if (shouldRunAutoRefresh) {
      listPhotos(false);
    }
  }, [shouldRunAutoRefresh, listPhotos]);

  return (
    <div className="flex flex-col gap-6 w-full">
      <GalleryControl onRefresh={listPhotos} />
      <ClientOnly>
        <PhotoGrid />
      </ClientOnly>
    </div>
  );
}
