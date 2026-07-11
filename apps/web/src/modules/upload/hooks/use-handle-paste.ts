import { useEffect, useEffectEvent } from "react";
import { useAtomValue, useSetAtom } from "jotai";
import { selectAtom } from "jotai/utils";

import { settings } from "@/stores/atoms/settings";
import { uploadQueue } from "../upload-queue";

const queueDefaultsAtom = selectAtom(
  settings.upload,
  ({ keyTemplate, compressionOption }) => ({
    keyTemplate,
    compressionOption,
  }),
  (left, right) =>
    left.keyTemplate === right.keyTemplate &&
    left.compressionOption === right.compressionOption,
);

/**
 * Handle paste event to append files to the file list
 */
export function useHandlePaste() {
  const send = useSetAtom(uploadQueue);
  const uploadSettings = useAtomValue(queueDefaultsAtom);

  const handlePaste = useEffectEvent((event: ClipboardEvent) => {
    if (!event.clipboardData) return;
    const items = event.clipboardData.items;
    if (!items) return;
    const files = Array.from(items)
      .filter((item) => item.kind === "file" && item.type.startsWith("image/"))
      .map((item) => item.getAsFile())
      .filter((file) => file !== null);
    send({
      type: "files.added",
      files,
      keyTemplate: uploadSettings?.keyTemplate,
      compressOption: uploadSettings?.compressionOption,
    });
  });

  useEffect(() => {
    window.addEventListener("paste", handlePaste);
    return () => {
      window.removeEventListener("paste", handlePaste);
    };
  }, []);
}
