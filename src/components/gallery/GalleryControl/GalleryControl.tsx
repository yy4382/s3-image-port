import { Button } from "@/components/ui/button";
import ImageS3Client from "@/utils/ImageS3Client";
import { useAtom, useAtomValue } from "jotai";
import { selectedPhotosAtom, useFetchPhotoList } from "../galleryStore";
import { validS3SettingsAtom } from "@/components/settings/settingsStore";
import McCheckbox from "~icons/mingcute/checkbox-line.jsx";
import McDelete from "~icons/mingcute/delete-3-line.jsx";
import McRefresh from "~icons/mingcute/refresh-2-line.jsx";
import { toast } from "sonner";
import { DisplayControl } from "./DisplayControl";

export function GalleryControl({ onRefresh }: { onRefresh: () => void }) {
  const [selectedPhotos, setSelectedPhotos] = useAtom(selectedPhotosAtom);
  const s3Settings = useAtomValue(validS3SettingsAtom);
  const listPhotos = useFetchPhotoList();
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
    <div className="flex gap-2 justify-between">
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
      <DisplayControl />
    </div>
  );
}
