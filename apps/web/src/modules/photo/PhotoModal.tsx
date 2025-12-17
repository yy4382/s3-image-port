"use client";
import { s3Key2Url } from "@/lib/s3/s3-key";
import { useAtomValue } from "jotai";
import { useLocale } from "use-intl";
import { useCallback, useEffect, useMemo, useState } from "react";
import { validS3SettingsAtom } from "@/stores/atoms/settings";
import { PhotoImg } from "@/modules/gallery/GalleryContent/PhotoItem/photo-img";
import { Button } from "@/components/ui/button";
import McArrowLeft from "~icons/mingcute/arrow-left-line";
import { CircleEllipsisIcon, CopyIcon, Trash2Icon } from "lucide-react";
import { photosAtomReadOnly } from "../gallery/hooks/use-photo-list";
import { PhotoOptions } from "../gallery/GalleryContent/PhotoItem/photo-options";
import { DeleteSecondConfirm } from "@/components/misc/delete-second-confirm";
import { getRouteApi } from "@tanstack/react-router";
import { usePhotoOperations } from "../gallery/hooks/photo";
import type { Photo } from "@/stores/schemas/photo";

const route = getRouteApi("/$locale/photo");

export default function PhotoModal() {
  const search = route.useSearch();
  const path = search.imagePath;

  return <PhotoModalContent path={path} />;
}

function PhotoModalContent({ path }: { path: string }) {
  const s3Settings = useAtomValue(validS3SettingsAtom);
  const url = useMemo(() => {
    if (!s3Settings) {
      return undefined;
    }
    return s3Key2Url(path, s3Settings);
  }, [path, s3Settings]);
  const navigate = route.useNavigate();
  const navigateBack = () => {
    navigate({
      to: "/$locale/gallery",
      params: (prev) => ({ locale: prev.locale }),
      search: (prev) => JSON.parse(prev.galleryState ?? "{}"),
    });
  };

  const photos = useAtomValue(photosAtomReadOnly);
  const photo = useMemo(() => {
    return photos.find((photo) => photo.Key === path);
  }, [photos, path]);

  if (!photo) {
    return (
      <div className="flex flex-col items-center justify-center h-screen w-screen dark relative bg-background">
        <div className="text-white text-2xl font-bold">Photo not found</div>
        <div className="text-white text-sm">Key: {path}</div>
        <div className="flex gap-2">
          <Button size="icon" variant="ghost" onClick={navigateBack}>
            Go back to gallery
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center h-screen w-screen dark relative bg-background">
      <div className="absolute top-0 left-0 right-0 z-20">
        <div className="absolute top-0 left-0 right-0 -bottom-2 bg-gradient-to-bottom z-10" />
        <PhotoModalToolbar photo={photo} />
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

function PhotoModalToolbar({ photo }: { photo: Photo }) {
  const navigate = route.useNavigate();
  const search = route.useSearch();
  const locale = useLocale();
  const [dropdownOpened, setDropdownOpened] = useState(false);

  const operations = usePhotoOperations(photo);

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

  const handleDelete = async () => {
    await operations.delete();
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
        <Button size="icon" variant="ghost" onClick={operations.copyUrl}>
          <CopyIcon />
        </Button>
        <DeleteSecondConfirm deleteFn={handleDelete} itemNames={[photo.Key]}>
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
