import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useAtom, useAtomValue } from "jotai";
import {
  filteredPhotosAtom,
  showingPhotosAtom,
  useFetchPhotoList,
} from "../hooks/use-photo-list";
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
import { CopyIcon } from "lucide-react";
import { useTranslations } from "use-intl";
import { useCopy } from "@/lib/hooks/use-copy";

export function GalleryControl() {
  const [selectedPhotos, setSelectedPhotos] = useAtom(selectedPhotosAtom);
  const showingPhotos = useAtomValue(showingPhotosAtom);
  const filteredPhotos = useAtomValue(filteredPhotosAtom);
  const s3Settings = useAtomValue(validS3SettingsAtom);
  const handleDelete = useDeletePhotos();
  const { fetchPhotoList, isLoading } = useFetchPhotoList();
  const t = useTranslations("gallery.control");
  const { copy } = useCopy();

  const selectCurrentPage = () => {
    setSelectedPhotos((prev) => {
      const newSet = new Set(prev);
      for (const photo of showingPhotos) {
        newSet.add(photo.Key);
      }
      return newSet;
    });
  };

  const copySelectedUrls = () => {
    const urls = filteredPhotos
      .filter((photo) => selectedPhotos.has(photo.Key))
      .map((photo) => photo.url);
    copy(urls.join("\n"), t("selectedUrls"));
  };

  return (
    <div className="flex gap-2 justify-between">
      {s3Settings === undefined && <InvalidS3Dialog />}
      <div className="flex gap-2">
        <Tooltip>
          <TooltipTrigger
            render={
              <Button
                aria-label={t("refresh")}
                onClick={() => fetchPhotoList()}
                disabled={isLoading}
                size={"icon"}
              >
                <McRefresh className={cn(isLoading && "animate-spin")} />
              </Button>
            }
          />
          <TooltipContent>{t("refresh")}</TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger
            render={
              <Button
                aria-label={t("selectCurrentPage")}
                onClick={selectCurrentPage}
                disabled={showingPhotos.length === 0}
                size={"icon"}
              >
                <McCheckbox />
              </Button>
            }
          />
          <TooltipContent>{t("selectCurrentPage")}</TooltipContent>
        </Tooltip>
        {selectedPhotos.size > 0 && (
          <>
            <Tooltip>
              <TooltipTrigger
                render={
                  <Button
                    aria-label={t("clearSelection")}
                    variant="secondary"
                    onClick={() => {
                      setSelectedPhotos(new Set<string>());
                    }}
                  >
                    <McCheckbox /> {selectedPhotos.size}
                  </Button>
                }
              />
              <TooltipContent>{t("clearSelection")}</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger
                render={
                  <Button
                    aria-label={t("copySelectedUrls")}
                    variant="secondary"
                    onClick={copySelectedUrls}
                  >
                    <CopyIcon /> {selectedPhotos.size}
                  </Button>
                }
              />
              <TooltipContent>{t("copySelectedUrls")}</TooltipContent>
            </Tooltip>
            <DeleteSecondConfirm
              deleteFn={() => handleDelete(Array.from(selectedPhotos))}
              itemNames={Array.from(selectedPhotos)}
              triggerTooltip={t("deleteSelected")}
              triggerRender={
                <Button
                  aria-label={t("deleteSelected")}
                  variant={"destructive"}
                >
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
