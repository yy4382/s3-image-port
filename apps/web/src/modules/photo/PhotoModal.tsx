"use client";
import key2Url from "@/lib/utils/key2Url";
import { useAtomValue } from "jotai";
import { useLocale } from "use-intl";
import { useCallback, useEffect, useMemo, useState } from "react";
import { validS3SettingsAtom } from "@/modules/settings/settings-store";
import { PhotoImg } from "@/modules/gallery/GalleryContent/PhotoItem/photo-img";
import { Button } from "@/components/ui/button";
import McArrowLeft from "~icons/mingcute/arrow-left-line";
import { CircleEllipsisIcon, CopyIcon, Trash2Icon } from "lucide-react";
import { photosAtomReadOnly } from "../gallery/use-photo-list";
import { toast } from "sonner";
import { useDeletePhotos } from "../gallery/use-delete";
import { PhotoOptions } from "../gallery/GalleryContent/PhotoItem/photo-options";
import { DeleteSecondConfirm } from "@/components/misc/delete-second-confirm";
import { getRouteApi } from "@tanstack/react-router";

const route = getRouteApi("/$locale/photo");

export default function PhotoModal() {
  const search = route.useSearch();
  const path = search.imagePath;

  return <PhotoModalContent path={path} />;
}

function PhotoModalContent({ path }: { path: string }) {
  const s3Options = useAtomValue(validS3SettingsAtom);
  const url = useMemo(() => {
    if (!s3Options) {
      return undefined;
    }
    return key2Url(path, s3Options);
  }, [path, s3Options]);

  return (
    <div className="flex flex-col items-center justify-center h-screen w-screen dark relative bg-background">
      <div className="absolute top-0 left-0 right-0 z-20">
        <div className="absolute top-0 left-0 right-0 -bottom-2 bg-gradient-to-bottom z-10" />
        <PhotoModalToolbar path={path} />
      </div>
      {url && (
        <div className="absolute inset-0">
          <PhotoImg
            url={url}
            s3Key={path}
            setLoadingState={() => {}}
            className="size-full object-contain"
          />
        </div>
      )}
    </div>
  );
}

function PhotoModalToolbar({ path }: { path: string }) {
  const navigate = route.useNavigate();
  const search = route.useSearch();
  const photos = useAtomValue(photosAtomReadOnly);
  const s3Options = useAtomValue(validS3SettingsAtom);
  const locale = useLocale();
  const [dropdownOpened, setDropdownOpened] = useState(false);

  const handleBack = useCallback(() => {
    navigate({
      to: "/$locale/gallery",
      params: { locale },
      search: (prev) => JSON.parse(prev.galleryState ?? "{}"),
    });
  }, [navigate, locale]);

  const handleAfterRename = useCallback(
    (newKey: string) => {
      navigate({
        to: "/$locale/photo",
        params: { locale },
        search: { imagePath: newKey, galleryState: search.galleryState },
      });
    },
    [navigate, locale, search.galleryState],
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

  const photo = useMemo(() => {
    return photos.find((photo) => photo.Key === path);
  }, [photos, path]);

  const handleCopy = () => {
    if (!s3Options) {
      toast.error("Please set S3 options first");
      return;
    }
    if (!photo) {
      toast.error("Photo metadata not found");
      return;
    }
    try {
      navigator.clipboard.writeText(photo.url);
      toast.success("Copied to clipboard");
    } catch {
      toast.error("Failed to copy to clipboard");
    }
  };

  const deletePhotos = useDeletePhotos();

  const handleDelete = async () => {
    if (!photo) {
      toast.error("Photo metadata not found");
      return;
    }
    await deletePhotos(photo.Key);
    handleBack();
  };

  if (!photo) {
    return null;
  }

  return (
    <div className="flex justify-between items-center text-white p-2 relative z-20">
      <div className="">
        <Button size="icon" variant="ghost" onClick={handleBack}>
          <McArrowLeft />
        </Button>
      </div>
      <div className="flex gap-2 items-center">
        <Button size="icon" variant="ghost" onClick={handleCopy}>
          <CopyIcon />
        </Button>
        <DeleteSecondConfirm deleteFn={handleDelete} itemNames={[path]}>
          <Button size="icon" variant="ghost">
            <Trash2Icon />
          </Button>
        </DeleteSecondConfirm>
        <PhotoOptions
          photo={photo}
          opened={dropdownOpened}
          setOpened={setDropdownOpened}
          onAfterDelete={handleBack}
          onAfterRename={handleAfterRename}
          trigger={
            <Button size="icon" variant="ghost">
              <CircleEllipsisIcon />
            </Button>
          }
        />
      </div>
    </div>
  );
}
