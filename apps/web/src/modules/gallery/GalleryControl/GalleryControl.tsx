import { Button } from "@/components/ui/button";
import { useAtom, useAtomValue } from "jotai";
import { useFetchPhotoList } from "../hooks/use-photo-list";
import { validS3SettingsAtom } from "@/stores/atoms/settings";
import McCheckbox from "~icons/mingcute/checkbox-line.jsx";
import McDelete from "~icons/mingcute/delete-3-line.jsx";
import McRefresh from "~icons/mingcute/refresh-2-line.jsx";
import { DisplayControl } from "./DisplayControl";
import { Suspense } from "react";
import { InvalidS3Dialog } from "@/modules/settings/InvalidS3Dialog";
import { DeleteSecondConfirm } from "@/components/misc/delete-second-confirm";
import { cn } from "@/lib/utils";
import { useDeletePhotos } from "../hooks/use-delete";
import { selectedPhotosAtom } from "@/stores/atoms/gallery";

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
              triggerRender={
                <Button variant={"destructive"}>
                  <McDelete /> {selectedPhotos.size}
                </Button>
              }
            />
          </>
        )}
      </div>
      <Suspense>
        <DisplayControl />
      </Suspense>
    </div>
  );
}
