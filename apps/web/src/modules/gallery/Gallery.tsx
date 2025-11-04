"use client";

import { galleryDirtyStatusAtom, useFetchPhotoList } from "./use-photo-list";
import { PhotoGrid } from "./GalleryContent/PhotoGrid";
import { GalleryControl } from "./GalleryControl/GalleryControl";
import { ClientOnly } from "@tanstack/react-router";
import { useEffect } from "react";
import {
  gallerySettingsAtom,
  validS3SettingsAtom,
} from "../settings/settings-store";
import { atom, useAtomValue } from "jotai";

const shouldRunAutoRefreshAtom = atom((get) => {
  if (get(galleryDirtyStatusAtom)) {
    return true;
  }
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
  const { fetchPhotoList } = useFetchPhotoList();
  const shouldRunAutoRefresh = useAtomValue(shouldRunAutoRefreshAtom);

  useEffect(() => {
    if (shouldRunAutoRefresh) {
      fetchPhotoList(false);
    }
  }, [shouldRunAutoRefresh, fetchPhotoList]);

  return (
    <div className="flex flex-col gap-6 w-full">
      <GalleryControl />
      <ClientOnly>
        <PhotoGrid />
      </ClientOnly>
    </div>
  );
}
