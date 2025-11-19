import { useSync } from "../../use-sync";
import { ConfirmPullDialog } from "../confirm-dialogs/confirm-pull-dialog";
import { ConfirmConflictDialog } from "../confirm-dialogs/confirm-conflict-dialog";
import { ClientOnly } from "@tanstack/react-router";

export type SyncProviderProps = {
  render: React.FC<{
    syncMutation: ReturnType<typeof useSync>["syncMutation"];
  }>;
};
function SyncProvider({ render }: SyncProviderProps) {
  const { confirmPull, confirmConflict, syncMutation } = useSync();
  return (
    <>
      {render({ syncMutation })}
      <ConfirmPullDialog
        open={confirmPull.isOpen}
        data={confirmPull.data}
        onResolve={confirmPull.resolve}
      />
      <ConfirmConflictDialog
        open={confirmConflict.isOpen}
        data={confirmConflict.data}
        onResolve={confirmConflict.resolve}
      />
    </>
  );
}

function SyncProviderClient(props: SyncProviderProps) {
  return (
    <ClientOnly>
      <SyncProvider {...props} />
    </ClientOnly>
  );
}

export { SyncProviderClient as SyncProvider };
