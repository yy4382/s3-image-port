import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useAtom, useAtomValue, useSetAtom } from "jotai";
import { selectAtom } from "jotai/utils";
import { settings } from "@/stores/atoms/settings";
import McCheckbox from "~icons/mingcute/checkbox-line.jsx";
import McDelete from "~icons/mingcute/delete-3-line.jsx";
import McRefresh from "~icons/mingcute/refresh-2-line.jsx";
import { DisplayControl } from "./DisplayControl";
import { Suspense, useEffect, useRef } from "react";
import { InvalidS3Dialog } from "@/modules/settings/InvalidS3Dialog";
import { DeleteSecondConfirm } from "@/components/misc/delete-second-confirm";
import { cn } from "@/lib/utils";
import { CopyIcon } from "lucide-react";
import { useTranslations } from "use-intl";
import { useCopy } from "@/lib/hooks/use-copy";
import { imageCatalog } from "@/modules/image-catalog";
import { toast } from "sonner";

const storageConfiguredAtom = selectAtom(
  settings.storage,
  ({ validation }) => validation.status === "valid",
);
const galleryStateAtom = selectAtom(
  imageCatalog.state,
  ({ gallery, refresh }) => ({
    showing: gallery.currentPageImages,
    filtered: gallery.filteredImages,
    refreshing: refresh.status === "refreshing",
  }),
  (left, right) =>
    left.showing === right.showing &&
    left.filtered === right.filtered &&
    left.refreshing === right.refreshing,
);

export function GalleryControl() {
  const [selection, updateSelection] = useAtom(imageCatalog.view.selection);
  const { showing, filtered, refreshing } = useAtomValue(galleryStateAtom);
  const storageConfigured = useAtomValue(storageConfiguredAtom);
  const runCatalog = useSetAtom(imageCatalog.run);
  const t = useTranslations("gallery.control");
  const tStore = useTranslations("gallery.store");
  const { copy } = useCopy();
  const mounted = useRef(false);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  const selectCurrentPage = () => {
    updateSelection({ type: "select-current-page" });
  };

  const copySelectedUrls = async () => {
    if (!selection.canDelete) return;
    const outcomes = await Promise.all(
      filtered
        .filter((photo) => selection.keys.has(photo.key))
        .map((photo) =>
          runCatalog({
            type: "access",
            key: photo.key,
            purpose: "url",
          }),
        ),
    );
    if (!mounted.current) return;
    const urls = outcomes.flatMap((outcome) =>
      outcome.status === "accessed" && outcome.purpose === "url"
        ? [outcome.value]
        : [],
    );
    if (urls.length !== outcomes.length || urls.length === 0) return;
    copy(urls.join("\n"), t("selectedUrls"));
  };

  const handleDelete = async (keys: string[]) => {
    if (!selection.canDelete) return;
    toast.message(t("requestingDelete"));
    const outcome = await runCatalog({ type: "delete", keys });
    if (!mounted.current) return;
    if (outcome.status === "superseded") return outcome;
    if (outcome.status === "deleted") toast.success(t("deleteSuccess"));
    else if (outcome.status === "invalid-settings")
      toast.error(t("s3SettingsNotFound"));
    else toast.error(t("deleteFailed"));
    return outcome;
  };

  return (
    <div className="flex gap-2 justify-between">
      {!storageConfigured && <InvalidS3Dialog />}
      <div className="flex gap-2">
        <Tooltip>
          <TooltipTrigger
            render={
              <Button
                aria-label={t("refresh")}
                onClick={async () => {
                  const outcome = await runCatalog({
                    type: "refresh",
                    intent: "foreground",
                    reason: "manual",
                  });
                  if (!mounted.current) return;
                  if (outcome.status === "refreshed")
                    toast.message(tStore("fetchedPhotos"));
                  else if (outcome.status === "invalid-settings")
                    toast.error(tStore("s3SettingsNotFound"));
                  else if (outcome.status === "refresh-failed")
                    toast.error(tStore("failedToFetchPhotos"));
                }}
                disabled={refreshing}
                size={"icon"}
              >
                <McRefresh className={cn(refreshing && "animate-spin")} />
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
                disabled={showing.length === 0}
                size={"icon"}
              >
                <McCheckbox />
              </Button>
            }
          />
          <TooltipContent>{t("selectCurrentPage")}</TooltipContent>
        </Tooltip>
        {selection.count > 0 && (
          <>
            <Tooltip>
              <TooltipTrigger
                render={
                  <Button
                    aria-label={t("clearSelection")}
                    variant="secondary"
                    onClick={() => {
                      updateSelection({ type: "clear" });
                    }}
                  >
                    <McCheckbox /> {selection.count}
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
                    disabled={!selection.canDelete}
                  >
                    <CopyIcon /> {selection.count}
                  </Button>
                }
              />
              <TooltipContent>{t("copySelectedUrls")}</TooltipContent>
            </Tooltip>
            <DeleteSecondConfirm
              deleteFn={() => handleDelete([...selection.keys])}
              itemNames={[...selection.keys]}
              triggerTooltip={t("deleteSelected")}
              triggerRender={
                <Button
                  aria-label={t("deleteSelected")}
                  variant={"destructive"}
                  disabled={!selection.canDelete}
                >
                  <McDelete /> {selection.count}
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
