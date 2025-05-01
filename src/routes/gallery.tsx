import { Button } from "@/components/ui/button";
import type { Photo } from "@/utils/ImageS3Client";
import ImageS3Client from "@/utils/ImageS3Client";
import { createFileRoute } from "@tanstack/react-router";
import { atom, useAtom, useSetAtom } from "jotai";
import { atomWithStorage } from "jotai/utils";
import { useS3SettingsValue } from "./settings/s3";
import { PhotoGrid, resetGridStateAtom } from "@/components/Photo/PhotoGrid";
import McCheckbox from "~icons/mingcute/checkbox-line";
import McDelete from "~icons/mingcute/delete-3-line";
import McRefresh from "~icons/mingcute/refresh-2-line";
import { toast } from "sonner";
import { useCallback } from "react";

export const Route = createFileRoute("/gallery")({
  component: RouteComponent,
});

function RouteComponent() {
  return (
    <div>
      <Gallery />
    </div>
  );
}

export const photosAtom = atomWithStorage<Photo[]>("s3ip:gallery:photos", []);

export const useListPhotos = () => {
  const setPhotos = useSetAtom(photosAtom);
  const s3Settings = useS3SettingsValue();

  const listPhotos = useCallback(async () => {
    if (!s3Settings) {
      toast.error("S3 settings not found");
      console.error("S3 settings not found");
      return;
    }
    let photos: Photo[];
    try {
      photos = await new ImageS3Client(s3Settings).list();
    } catch (error) {
      toast.error("Failed to fetch photos");
      console.error("Failed to fetch photos", error);
      return;
    }
    if (photos) {
      toast.message("Fetched photos");
      console.log("Fetched photos", photos.length);
      setPhotos(photos);
    } else {
      toast.error("Failed to fetch photos");
      console.error("Failed to fetch photos");
    }
  }, [s3Settings, setPhotos]);

  return listPhotos;
};

function Gallery() {
  const listPhotos = useListPhotos();

  return (
    <div className="flex flex-col gap-6 w-full">
      <GalleryControl onRefresh={listPhotos} />
      <GalleryContent />
    </div>
  );
}

export const selectedPhotosAtom = atom<Set<string>>(new Set<string>());
export const selectModeAtom = atom((get) => {
  const selected = get(selectedPhotosAtom);
  return selected.size > 0;
});

function GalleryControl({ onRefresh }: { onRefresh: () => void }) {
  const [selectedPhotos, setSelectedPhotos] = useAtom(selectedPhotosAtom);
  const s3Settings = useS3SettingsValue();
  const listPhotos = useListPhotos();
  async function handleDelete() {
    if (!s3Settings) {
      toast.error("S3 settings not found");
      return;
    }
    try {
      toast.message("Requested delete...");
      await Promise.all(
        Array.from(selectedPhotos).map(async (key) => {
          await new ImageS3Client(s3Settings).delete(key);
        }),
      );
      toast.success("Deleted photos");
    } catch (error) {
      toast.error("Failed to delete photos");
      console.error("Failed to delete photos", error);
    } finally {
      setSelectedPhotos(new Set<string>());
      await listPhotos();
    }
  }
  return (
    <div className="flex gap-2">
      <Button onClick={onRefresh} size={"icon"}>
        <McRefresh />
      </Button>
      {selectedPhotos.size > 0 && (
        <>
          <Button
            variant="secondary"
            onClick={() => {
              setSelectedPhotos(new Set<string>());
            }}
          >
            <McCheckbox /> {selectedPhotos.size}
          </Button>
          <Button variant={"destructive"} onClick={handleDelete}>
            <McDelete /> {selectedPhotos.size}
          </Button>
        </>
      )}
    </div>
  );
}

function GalleryContent() {
  return <PhotoGrid />;
}

// used when changing profiles
export const resetGalleryStateAtom = atom(null, (_get, set) => {
  set(photosAtom, []);
  set(selectedPhotosAtom, new Set<string>());
  set(resetGridStateAtom);
});
