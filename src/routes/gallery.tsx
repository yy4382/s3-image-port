import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import type { Photo } from "@/utils/ImageS3Client";
import ImageS3Client from "@/utils/ImageS3Client";
import { createFileRoute } from "@tanstack/react-router";
import { atom, useAtom, useSetAtom } from "jotai";
import { atomWithStorage } from "jotai/utils";
import { useS3SettingsValue } from "./settings/s3";
import { PhotoGrid } from "@/components/Photo/PhotoGrid";

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

function Gallery() {
  const setPhotos = useSetAtom(photosAtom);
  const s3Settings = useS3SettingsValue();

  async function handleRefresh() {
    if (!s3Settings) {
      // TODO use toast
      console.error("S3 settings not found");
      return;
    }
    let photos: Photo[];
    try {
      photos = await new ImageS3Client(s3Settings).list();
    } catch (error) {
      // TODO use toast
      console.error("Failed to fetch photos", error);
      return;
    }
    if (photos) {
      // TODO use toast
      console.log("Fetched photos", photos.length);
      setPhotos(photos);
    } else {
      // TODO use toast
      console.error("Failed to fetch photos");
    }
  }
  return (
    <div className="flex flex-col gap-6 w-full">
      <GalleryControl onRefresh={handleRefresh} />
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
  return (
    <Card>
      <CardContent>
        <Button onClick={onRefresh}>Refresh</Button>
        {selectedPhotos.size > 0 && (
          <Button
            onClick={() => {
              setSelectedPhotos(new Set<string>());
            }}
          >
            {selectedPhotos.size} Selected
          </Button>
        )}
      </CardContent>
    </Card>
  );
}

function GalleryContent() {
  return <PhotoGrid />;
}
