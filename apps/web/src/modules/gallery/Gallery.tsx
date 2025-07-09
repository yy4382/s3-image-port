"use client";

import { galleryDirtyStatusAtom, useFetchPhotoList } from "./galleryStore";
import { PhotoGrid } from "./GalleryContent/PhotoGrid";
import { GalleryControl } from "./GalleryControl/GalleryControl";
import { ClientOnly } from "@/components/misc/client-only";
import { useEffect } from "react";
import {
  gallerySettingsAtom,
  validS3SettingsAtom,
} from "../settings/settings-store";
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
  const { fetchPhotoList } = useFetchPhotoList();
  const shouldRunAutoRefresh = useAtomValue(shouldRunAutoRefreshAtom);
  const galleryDirty = useAtomValue(galleryDirtyStatusAtom);

  useEffect(() => {
    if (shouldRunAutoRefresh || galleryDirty) {
      fetchPhotoList(false);
    }
  }, [shouldRunAutoRefresh, fetchPhotoList, galleryDirty]);

  return (
    <div className="flex flex-col gap-6 w-full">
      <GalleryControl />
      <ClientOnly>
        <PhotoGrid />
      </ClientOnly>
    </div>
  );
}
