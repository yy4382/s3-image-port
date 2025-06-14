import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "../ui/button";
import { useState } from "react";

export function DeleteSecondConfirm({
  deleteFn,
  children,
  itemNames,
}: {
  deleteFn: () => void;
  itemNames: string[];
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Delete Confirm</DialogTitle>
          <DialogDescription>
            Are you sure you want to delete these items?
          </DialogDescription>
        </DialogHeader>
        <ul className="list-disc list-inside max-h-[300px] overflow-y-auto">
          {itemNames.map((name) => (
            <li key={name}>{name}</li>
          ))}
        </ul>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button
            onClick={() => {
              deleteFn();
              setOpen(false);
            }}
          >
            Delete
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
