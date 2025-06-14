"use client";
import { redirect, useRouter } from "@/i18n/navigation";
import key2Url from "@/lib/utils/key2Url";
import { useAtomValue } from "jotai";
import { useLocale } from "next-intl";
import { useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo } from "react";
import { validS3SettingsAtom } from "@/modules/settings/settingsStore";
import { PhotoImg } from "@/modules/gallery/GalleryContent/PhotoItem/PhotoItem";
import { Button } from "@/components/ui/button";
import McArrowLeft from "~icons/mingcute/arrow-left-line";
import { CircleEllipsisIcon, CopyIcon, Trash2Icon } from "lucide-react";
import { photosAtomReadOnly } from "../gallery/galleryStore";
import { toast } from "sonner";
import { useDeletePhotos } from "../gallery/GalleryControl/GalleryControl";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "../../components/ui/dropdown-menu";
import { format } from "date-fns";
import ImageS3Client from "@/lib/utils/ImageS3Client";
import { DeleteSecondConfirm } from "@/components/misc/delete-second-confirm";

export default function PhotoModal() {
  const locale = useLocale();
  const searchParams = useSearchParams();
  const path = useMemo(() => {
    return searchParams.get("imagePath");
  }, [searchParams]);

  if (!path) {
    return redirect({ href: "/gallery", locale });
  }

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
  const searchParams = useSearchParams();
  const photos = useAtomValue(photosAtomReadOnly);
  const s3Options = useAtomValue(validS3SettingsAtom);
  const router = useRouter();

  const handleBack = useCallback(() => {
    const newSearch = new URLSearchParams(searchParams);
    newSearch.delete("imagePath");

    router.push(`/gallery?${newSearch.toString()}`);
  }, [router, searchParams]);

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

  const handleDownload = async () => {
    if (!s3Options) {
      toast.error("Please set S3 options first");
      return;
    }
    if (!photo) {
      toast.error("Photo metadata not found");
      return;
    }
    try {
      const res = await new ImageS3Client(s3Options).get(photo.Key);
      if (!res.Body) {
        toast.error("Failed to download photo");
        return;
      }

      const blob = new Blob([await res.Body.transformToByteArray()]);

      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = photo.Key;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      console.error(e);
      toast.error("Failed to download photo");
    }
  };

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
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button size="icon" variant="ghost">
              <CircleEllipsisIcon />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuLabel>
              Key <span className="text-sm font-normal">{path}</span>
            </DropdownMenuLabel>
            <DropdownMenuLabel>
              Last modified{" "}
              <span className="text-sm font-normal">
                {photo
                  ? format(photo.LastModified, "yyyy-MM-dd HH:mm:ss")
                  : "unknown"}
              </span>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleDownload}>
              Download
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => {
                toast.error("not implemented yet");
                console.error("Modify key is not implemented yet");
                return;
              }}
            >
              Modify Key
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}
