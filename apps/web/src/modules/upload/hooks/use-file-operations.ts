import { useAtom } from "jotai";
import type { PrimitiveAtom } from "jotai";
import { useCallback } from "react";

import type { CompressOption } from "@/lib/utils/imageCompress";
import { S3KeyMetadata } from "@/lib/s3/s3-key";
import type { PendingUpload } from "../types";

/**
 * A enhanced hook like `useAtom(PendingUploadAtom)` but replace the `set` with custom callback
 * @param atom - The file atom
 * @returns The file and update functions
 */
export function useFileAtomOperations(atom: PrimitiveAtom<PendingUpload>) {
  const [file, setFile] = useAtom(atom);

  const updateProcessOption = useCallback(
    (option: CompressOption | null) => {
      setFile((prev) => ({
        ...prev,
        status: "pending",
        processedFile: null,
        compressOption: option,
      }));
    },
    [setFile],
  );

  const updateTemplate = useCallback(
    (template: string) => {
      setFile((prev) => ({
        ...prev,
        key: S3KeyMetadata.updateTemplate(template, prev.key),
      }));
    },
    [setFile],
  );

  return {
    file,
    updateProcessOption,
    updateTemplate,
  };
}
