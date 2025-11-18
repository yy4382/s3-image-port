import { Button } from "@/components/ui/button";
import {
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { AlertCircle } from "lucide-react";
import { ConfirmDialog } from "./confirm-dialog";

export function ConfirmDeleteDialog({
  open,
  onResolve,
}: {
  open: boolean;
  onResolve: (value: boolean) => void;
}) {
  return (
    <ConfirmDialog open={open} onResolve={onResolve}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-destructive" />
            Delete Remote Sync Data
          </DialogTitle>
          <DialogDescription>
            Are you sure you want to delete your remote sync data? This action
            cannot be undone.
          </DialogDescription>
        </DialogHeader>

        <DialogFooter>
          <Button variant="outline" onClick={() => onResolve(false)}>
            Cancel
          </Button>
          <Button variant="destructive" onClick={() => onResolve(true)}>
            Delete
          </Button>
        </DialogFooter>
      </DialogContent>
    </ConfirmDialog>
  );
}
