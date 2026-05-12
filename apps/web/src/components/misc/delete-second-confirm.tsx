import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Button } from "../ui/button";
import { useState, type ComponentPropsWithRef, type ReactNode } from "react";
import { useTranslations } from "use-intl";

export function DeleteSecondConfirm({
  deleteFn,
  triggerRender,
  triggerTooltip,
  itemNames,
}: {
  deleteFn: () => void;
  itemNames: string[];
  triggerRender: ComponentPropsWithRef<typeof DialogTrigger>["render"];
  triggerTooltip?: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const t = useTranslations("gallery.control.deleteConfirm");
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {triggerTooltip ? (
        <Tooltip>
          <TooltipTrigger render={<DialogTrigger render={triggerRender} />} />
          <TooltipContent>{triggerTooltip}</TooltipContent>
        </Tooltip>
      ) : (
        <DialogTrigger render={triggerRender} />
      )}
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("title")}</DialogTitle>
          <DialogDescription>{t("description")}</DialogDescription>
        </DialogHeader>
        <ul className="list-disc list-inside max-h-[300px] overflow-y-auto">
          {itemNames.map((name) => (
            <li key={name}>{name}</li>
          ))}
        </ul>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            {t("cancel")}
          </Button>
          <Button
            onClick={() => {
              deleteFn();
              setOpen(false);
            }}
          >
            {t("delete")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
