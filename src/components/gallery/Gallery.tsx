"use client";

import { useFetchPhotoList } from "./galleryStore";
import { PhotoGrid } from "@/components/gallery/GalleryContent/PhotoGrid";
import { GalleryControl } from "./GalleryControl/GalleryControl";
import { ClientOnly } from "../misc/client-only";

export function Gallery() {
  const listPhotos = useFetchPhotoList();

  return (
    <div className="flex flex-col gap-6 w-full">
      <GalleryControl onRefresh={listPhotos} />
      <ClientOnly>
        <PhotoGrid />
      </ClientOnly>
    </div>
  );
}
