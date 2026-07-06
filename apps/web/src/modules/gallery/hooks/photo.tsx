import type { StoredImage } from "@/modules/image-storage";
import { useDeletePhotos } from "./use-delete";
import { useDownloadPhoto } from "./use-download";
import { useRenamePhoto } from "./use-rename";
import { useCallback } from "react";
import { toggleSelectedAtom } from "./use-select";
import { useAtomValue, useSetAtom } from "jotai";
import { useCopy } from "@/lib/hooks/use-copy";
import { s3Key2Url } from "@/lib/s3/s3-key";
import { validS3SettingsAtom } from "@/stores/atoms/settings";

export function usePhotoOperations(photo: StoredImage) {
  const deletePhotos = useDeletePhotos();
  const downloadPhoto = useDownloadPhoto();
  const renamePhoto = useRenamePhoto();
  const toggleSelected = useSetAtom(toggleSelectedAtom);
  const s3Settings = useAtomValue(validS3SettingsAtom);

  const deleteFn = useCallback(async () => {
    await deletePhotos(photo.key);
  }, [deletePhotos, photo.key]);

  const handleRename = useCallback(
    async (newKey: string) => {
      return await renamePhoto(photo.key, newKey);
    },
    [renamePhoto, photo.key],
  );

  const handleDownload = useCallback(async () => {
    await downloadPhoto(photo.key);
  }, [downloadPhoto, photo.key]);

  const { copy } = useCopy();

  const handleCopyMarkdown = () => {
    if (!s3Settings) return;
    const markdown = `![${photo.key}](${s3Key2Url(photo.key, s3Settings)})`;
    copy(markdown, "Markdown link");
  };
  const handleCopyUrl = () => {
    if (!s3Settings) return;
    copy(s3Key2Url(photo.key, s3Settings), "URL");
  };
  const handleToggleSelected = useCallback(
    (check: boolean | "toggle", shift: boolean) => {
      toggleSelected(photo.key, check, shift);
    },
    [toggleSelected, photo.key],
  );

  return {
    delete: deleteFn,
    rename: handleRename,
    download: handleDownload,
    copyMarkdown: handleCopyMarkdown,
    copyUrl: handleCopyUrl,
    toggleSelected: handleToggleSelected,
  };
}
