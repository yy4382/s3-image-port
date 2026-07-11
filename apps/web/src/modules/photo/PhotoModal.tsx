"use client";
import { useAtomValue, useSetAtom } from "jotai";
import { selectAtom } from "jotai/utils";
import deepEqual from "fast-deep-equal";
import { useLocale, useTranslations } from "use-intl";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { PhotoImg } from "@/modules/gallery/GalleryContent/PhotoItem/photo-img";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import McArrowLeft from "~icons/mingcute/arrow-left-line";
import { CircleEllipsisIcon, CopyIcon, Trash2Icon } from "lucide-react";
import { PhotoOptions } from "../gallery/GalleryContent/PhotoItem/photo-options";
import { DeleteSecondConfirm } from "@/components/misc/delete-second-confirm";
import { getRouteApi } from "@tanstack/react-router";
import type { StoredImage } from "@/modules/image-storage";
import { imageCatalog } from "@/modules/image-catalog";
import { useCopy } from "@/lib/hooks/use-copy";
import { toast } from "sonner";

const route = getRouteApi("/$locale/photo");

export default function PhotoModal() {
  const search = route.useSearch();
  const path = search.imagePath;
  const [galleryState] = useState(search.galleryState);
  const [gallerySearch] = useState<Record<string, unknown>>(() => {
    try {
      const parsed = JSON.parse(galleryState ?? "{}");
      return typeof parsed === "object" && parsed !== null ? parsed : {};
    } catch {
      return {};
    }
  });

  return (
    <PhotoModalContent
      path={path}
      galleryState={galleryState}
      gallerySearch={gallerySearch}
    />
  );
}

function PhotoModalContent({
  path,
  galleryState,
  gallerySearch,
}: {
  path: string;
  galleryState: string | undefined;
  gallerySearch: Record<string, unknown>;
}) {
  const itemAtom = useMemo(() => imageCatalog.item(path), [path]);
  const item = useAtomValue(itemAtom);
  const photoAtom = useMemo(
    () =>
      selectAtom(
        imageCatalog.state,
        ({ projection }) =>
          projection.images.find((image) => image.key === path),
        deepEqual,
      ),
    [path],
  );
  const photo = useAtomValue(photoAtom);
  const navigate = route.useNavigate();
  const navigateBack = () => {
    navigate({
      to: "/$locale/gallery",
      params: (prev) => ({ locale: prev.locale }),
      search: gallerySearch,
    });
  };

  return (
    <div className="flex flex-col items-center justify-center h-screen w-screen dark relative bg-background">
      <div className="absolute top-0 left-0 right-0 z-20">
        <div className="absolute top-0 left-0 right-0 -bottom-2 bg-gradient-to-bottom z-10" />
        <PhotoModalToolbar
          path={path}
          photo={photo}
          disabled={!item.access || item.reserved}
          galleryState={galleryState}
          gallerySearch={gallerySearch}
        />
      </div>
      {!photo ? (
        <div className="flex flex-col items-center justify-center">
          <div className="text-white text-2xl font-bold">Photo not found</div>
          <div className="text-white text-sm">Key: {path}</div>
          <div className="flex gap-2">
            <Button size="icon" variant="ghost" onClick={navigateBack}>
              Go back to gallery
            </Button>
          </div>
        </div>
      ) : item.source ? (
        <div className="absolute inset-0">
          <PhotoImg
            url={item.source}
            s3Key={path}
            setLoadingState={() => {}}
            className="size-full object-contain"
          />
        </div>
      ) : null}
    </div>
  );
}

function PhotoModalToolbar({
  path,
  photo,
  disabled,
  galleryState,
  gallerySearch,
}: {
  path: string;
  photo: StoredImage | undefined;
  disabled: boolean;
  galleryState: string | undefined;
  gallerySearch: Record<string, unknown>;
}) {
  const navigate = route.useNavigate();
  const locale = useLocale();
  const t = useTranslations("gallery.item.options");
  const [dropdownOpened, setDropdownOpened] = useState(false);
  const runCatalog = useSetAtom(imageCatalog.run);
  const { copy } = useCopy();
  const tControl = useTranslations("gallery.control");
  const mounted = useRef(false);
  const renderedPhoto = photo ?? { key: path };

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  const handleBack = useCallback(() => {
    navigate({
      to: "/$locale/gallery",
      params: { locale },
      search: gallerySearch,
    });
  }, [gallerySearch, navigate, locale]);

  const handleAfterRename = useCallback(
    (newKey: string) => {
      navigate({
        to: "/$locale/photo",
        params: { locale },
        search: { imagePath: newKey, galleryState },
      });
    },
    [galleryState, navigate, locale],
  );

  useEffect(() => {
    function handleEscBack(event: KeyboardEvent) {
      if (event.key === "Escape") {
        handleBack();
      }
    }
    window.addEventListener("keydown", handleEscBack);
    return () => {
      window.removeEventListener("keydown", handleEscBack);
    };
  }, [handleBack]);

  const handleDelete = async () => {
    if (disabled || !renderedPhoto) return;
    toast.message(tControl("requestingDelete"));
    const outcome = await runCatalog({
      type: "delete",
      keys: [renderedPhoto.key],
    });
    if (!mounted.current) return;
    if (outcome.status === "superseded") return;
    if (outcome.status === "deleted") {
      toast.success(tControl("deleteSuccess"));
      handleBack();
    } else if (outcome.status === "invalid-settings") {
      toast.error(tControl("s3SettingsNotFound"));
    } else {
      toast.error(tControl("deleteFailed"));
    }
  };

  const copyUrl = async () => {
    if (disabled || !renderedPhoto) return;
    const outcome = await runCatalog({
      type: "access",
      key: renderedPhoto.key,
      purpose: "url",
    });
    if (
      mounted.current &&
      outcome.status === "accessed" &&
      outcome.purpose === "url"
    ) {
      copy(outcome.value, "URL");
    }
  };

  return (
    <div
      className={
        photo
          ? "flex justify-between items-center text-white p-2 relative z-20"
          : "hidden"
      }
      aria-hidden={!photo}
    >
      <div className="">
        <Tooltip>
          <TooltipTrigger
            render={
              <Button
                aria-label={t("backToGallery")}
                size="icon"
                variant="ghost"
                onClick={handleBack}
              >
                <McArrowLeft />
              </Button>
            }
          />
          <TooltipContent>{t("backToGallery")}</TooltipContent>
        </Tooltip>
      </div>
      <div className="flex gap-2 items-center">
        <Tooltip>
          <TooltipTrigger
            render={
              <Button
                aria-label={t("copyUrl")}
                size="icon"
                variant="ghost"
                onClick={copyUrl}
                disabled={disabled}
              >
                <CopyIcon />
              </Button>
            }
          />
          <TooltipContent>{t("copyUrl")}</TooltipContent>
        </Tooltip>
        <DeleteSecondConfirm
          deleteFn={handleDelete}
          itemNames={[renderedPhoto.key]}
          triggerTooltip={t("delete")}
          triggerRender={
            <Button
              aria-label={t("delete")}
              size="icon"
              variant="ghost"
              disabled={disabled}
            >
              <Trash2Icon />
            </Button>
          }
        />
        <PhotoOptions
          photo={renderedPhoto}
          opened={dropdownOpened}
          setOpened={setDropdownOpened}
          onAfterDelete={handleBack}
          onAfterRename={handleAfterRename}
          disabled={disabled}
          triggerTooltip={t("more")}
          triggerRender={
            <Button
              aria-label={t("more")}
              size="icon"
              variant="ghost"
              disabled={disabled}
            >
              <CircleEllipsisIcon />
            </Button>
          }
        />
      </div>
    </div>
  );
}
