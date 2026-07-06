import { useSelector } from "@xstate/react";
import { useCallback } from "react";

import type { CompressOption } from "@/lib/utils/imageCompress";
import {
  selectPendingUpload,
  type PendingUploadActorRef,
} from "../machines/pending-upload-machine";

/**
 * A focused pending-upload actor hook for editing user-controlled upload fields.
 * @param actorRef - The pending upload actor
 * @returns The file and update functions
 */
export function usePendingUploadOperations(actorRef: PendingUploadActorRef) {
  const file = useSelector(actorRef, selectPendingUpload);

  const updateProcessOption = useCallback(
    (option: CompressOption | null) => {
      actorRef.send({ type: "compression.updated", option });
    },
    [actorRef],
  );

  const updateTemplate = useCallback(
    (template: string) => {
      actorRef.send({ type: "template.updated", template });
    },
    [actorRef],
  );

  return {
    file,
    updateProcessOption,
    updateTemplate,
  };
}
