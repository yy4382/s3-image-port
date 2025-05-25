import { Button } from "@/components/ui/button";
import ImageS3Client from "@/utils/ImageS3Client";
import { useAtom, useAtomValue, useSetAtom } from "jotai";
import { selectedPhotosAtom, useFetchPhotoList } from "../galleryStore";
import { validS3SettingsAtom } from "@/components/settings/settingsStore";
import { SquareCheckIcon, Trash2Icon, RefreshCcwIcon } from "lucide-react";
import { toast } from "sonner";
import { DisplayControl } from "./DisplayControl";
import { Suspense, useCallback } from "react";
import { useTranslations } from "next-intl";
import { InvalidS3Dialog } from "@/components/settings/InvalidS3Dialog";

export function useDeletePhotos() {
  const setSelectedPhotos = useSetAtom(selectedPhotosAtom);
  const s3Settings = useAtomValue(validS3SettingsAtom);
  const listPhotos = useFetchPhotoList();
  const t = useTranslations("gallery.control");

  const handleDelete = useCallback(
    async (photos: string[] | string) => {
      if (!s3Settings) {
        toast.error(t("s3SettingsNotFound"));
        return;
      }
      try {
        toast.message(t("requestingDelete"));
        if (Array.isArray(photos)) {
          await Promise.all(
            photos.map(async (key) => {
              await new ImageS3Client(s3Settings).delete(key);
            }),
          );
        } else {
          await new ImageS3Client(s3Settings).delete(photos);
        }
        toast.success(t("deleteSuccess"));
      } catch (error) {
        toast.error(t("deleteFailed"));
        console.error("Failed to delete photos", error);
      } finally {
        setSelectedPhotos(new Set<string>());
        await listPhotos();
      }
    },
    [s3Settings, listPhotos, t, setSelectedPhotos],
  );

  return handleDelete;
}

export function GalleryControl({ onRefresh }: { onRefresh: () => void }) {
  const [selectedPhotos, setSelectedPhotos] = useAtom(selectedPhotosAtom);
  const s3Settings = useAtomValue(validS3SettingsAtom);
  const handleDelete = useDeletePhotos();

  return (
    <div className="flex gap-2 justify-between">
      {s3Settings === undefined && <InvalidS3Dialog />}
      <div className="flex gap-2">
        <Button onClick={onRefresh} size={"icon"}>
          <RefreshCcwIcon />
        </Button>
        {selectedPhotos.size > 0 && (
          <>
            <Button
              variant="secondary"
              onClick={() => {
                setSelectedPhotos(new Set<string>());
              }}
            >
              <SquareCheckIcon /> {selectedPhotos.size}
            </Button>
            <Button
              variant={"destructive"}
              onClick={() => handleDelete(Array.from(selectedPhotos))}
            >
              <Trash2Icon /> {selectedPhotos.size}
            </Button>
          </>
        )}
      </div>
      <Suspense>
        <DisplayControl />
      </Suspense>
    </div>
  );
}
