import { Button } from "@/components/ui/button";
import ImageS3Client from "@/lib/utils/ImageS3Client";
import { useAtom, useAtomValue, useSetAtom } from "jotai";
import { selectedPhotosAtom, useFetchPhotoList } from "../galleryStore";
import { validS3SettingsAtom } from "@/modules/settings/settings-store";
import McCheckbox from "~icons/mingcute/checkbox-line.jsx";
import McDelete from "~icons/mingcute/delete-3-line.jsx";
import McRefresh from "~icons/mingcute/refresh-2-line.jsx";
import { toast } from "sonner";
import { DisplayControl } from "./DisplayControl";
import { Suspense, useCallback } from "react";
import { useTranslations } from "next-intl";
import { InvalidS3Dialog } from "@/modules/settings/InvalidS3Dialog";
import { DeleteSecondConfirm } from "@/components/misc/delete-second-confirm";
import { cn } from "@/lib/utils";

export function useDeletePhotos() {
  const setSelectedPhotos = useSetAtom(selectedPhotosAtom);
  const s3Settings = useAtomValue(validS3SettingsAtom);
  const { fetchPhotoList } = useFetchPhotoList();
  const t = useTranslations("gallery.control");

  const handleDelete = useCallback(
    async (photos: string[] | string) => {
      if (!s3Settings) {
        toast.error(t("s3SettingsNotFound"));
        return;
      }
      try {
        toast.message(t("requestingDelete"));

        // because the photo list is always re-fetched in the finally block,
        // there's no need to set the gallery dirty status here
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
        await fetchPhotoList();
      }
    },
    [s3Settings, fetchPhotoList, t, setSelectedPhotos],
  );

  return handleDelete;
}

export function GalleryControl() {
  const [selectedPhotos, setSelectedPhotos] = useAtom(selectedPhotosAtom);
  const s3Settings = useAtomValue(validS3SettingsAtom);
  const handleDelete = useDeletePhotos();
  const { fetchPhotoList, isLoading } = useFetchPhotoList();

  return (
    <div className="flex gap-2 justify-between">
      {s3Settings === undefined && <InvalidS3Dialog />}
      <div className="flex gap-2">
        <Button
          onClick={() => fetchPhotoList()}
          disabled={isLoading}
          size={"icon"}
        >
          <McRefresh className={cn(isLoading && "animate-spin")} />
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
            <DeleteSecondConfirm
              deleteFn={() => handleDelete(Array.from(selectedPhotos))}
              itemNames={Array.from(selectedPhotos)}
            >
              <Button variant={"destructive"}>
                <McDelete /> {selectedPhotos.size}
              </Button>
            </DeleteSecondConfirm>
          </>
        )}
      </div>
      <Suspense>
        <DisplayControl />
      </Suspense>
    </div>
  );
}
