import { useEffect, useEffectEvent } from "react";

import { useAddFilesToUploadQueue } from "../upload-queue-context";

/**
 * Handle paste event to append files to the file list
 */
export function useHandlePaste() {
  const appendFiles = useAddFilesToUploadQueue();

  const handlePaste = useEffectEvent((event: ClipboardEvent) => {
    if (!event.clipboardData) return;
    const items = event.clipboardData.items;
    if (!items) return;
    const files = Array.from(items)
      .filter((item) => item.kind === "file" && item.type.startsWith("image/"))
      .map((item) => item.getAsFile())
      .filter((file) => file !== null);
    appendFiles(files);
  });

  useEffect(() => {
    window.addEventListener("paste", handlePaste);
    return () => {
      window.removeEventListener("paste", handlePaste);
    };
  }, []);
}
