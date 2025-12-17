import type { Photo } from "@/stores/schemas/photo";
import { useDeletePhotos } from "./use-delete";
import { useDownloadPhoto } from "./use-download";
import { useRenamePhoto } from "./use-rename";
import { useCallback } from "react";
import { toggleSelectedAtom } from "./use-select";
import { useSetAtom } from "jotai";
import { useCopy } from "@/lib/hooks/use-copy";

export function usePhotoOperations(photo: Photo) {
  const deletePhotos = useDeletePhotos();
  const downloadPhoto = useDownloadPhoto();
  const renamePhoto = useRenamePhoto();
  const toggleSelected = useSetAtom(toggleSelectedAtom);

  const deleteFn = useCallback(async () => {
    await deletePhotos(photo.Key);
  }, [deletePhotos, photo.Key]);

  const handleRename = useCallback(
    async (newKey: string) => {
      return await renamePhoto(photo.Key, newKey);
    },
    [renamePhoto, photo.Key],
  );

  const handleDownload = useCallback(async () => {
    await downloadPhoto(photo.Key);
  }, [downloadPhoto, photo.Key]);

  const { copy } = useCopy();

  const handleCopyMarkdown = () => {
    const markdown = `![${photo.Key}](${photo.url})`;
    copy(markdown, "Markdown link");
  };
  const handleCopyUrl = () => {
    copy(photo.url, "URL");
  };
  const handleToggleSelected = useCallback(
    (check: boolean | "toggle", shift: boolean) => {
      toggleSelected(photo.Key, check, shift);
    },
    [toggleSelected, photo.Key],
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
