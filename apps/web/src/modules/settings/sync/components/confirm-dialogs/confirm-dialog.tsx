import { Dialog } from "@/components/ui/dialog";
import { type ReactNode } from "react";

interface ConfirmDialogProps {
  open: boolean;
  onResolve: (value: boolean) => void;
  children: ReactNode;
}

export function ConfirmDialog({
  open,
  onResolve,
  children,
}: ConfirmDialogProps) {
  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onResolve(false)}>
      {children}
    </Dialog>
  );
}
