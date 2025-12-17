import { useSetAtom } from "jotai";
import { useEffect, useEffectEvent } from "react";

import { appendFilesAtom } from "../atoms/upload-atoms";

/**
 * Handle paste event to append files to the file list
 */
export function useHandlePaste() {
  const appendFiles = useSetAtom(appendFilesAtom);

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
