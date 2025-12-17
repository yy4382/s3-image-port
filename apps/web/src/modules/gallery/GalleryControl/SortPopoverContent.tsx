import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { XIcon } from "lucide-react";
import { GalleryFilterOptions as DisplayOptions } from "@/stores/schemas/gallery/filter";
import { useTranslations } from "use-intl";

interface SortPopoverContentProps {
  currentDisplayOptions: DisplayOptions;
  handleUpdate: (update: Partial<DisplayOptions>) => void;
  isSearchActive: boolean;
  setSortPopoverOpen: (open: boolean) => void;
}

export function SortPopoverContent({
  currentDisplayOptions,
  handleUpdate,
  isSearchActive,
  setSortPopoverOpen,
}: SortPopoverContentProps) {
  const t = useTranslations("gallery.sort");

  return (
    <div className="grid gap-4">
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <h4 className="font-medium leading-none">{t("sortOptions")}</h4>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setSortPopoverOpen(false)}
          >
            <XIcon className="h-4 w-4" />
          </Button>
        </div>
        <p className="text-sm text-muted-foreground">
          {isSearchActive ? t("sortActiveMessage") : t("sortInactiveMessage")}
        </p>
      </div>
      <div className="grid gap-2">
        <Label htmlFor="sort-by">{t("sortBy")}</Label>
        <p className="text-xs text-muted-foreground">{t("sortProperty")}</p>
        <Select
          value={currentDisplayOptions.sortBy}
          onValueChange={(value: "key" | "date") =>
            handleUpdate({ sortBy: value })
          }
          disabled={isSearchActive}
        >
          <SelectTrigger id="sort-by" disabled={isSearchActive}>
            <SelectValue placeholder={t("selectProperty")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="date">{t("date")}</SelectItem>
            <SelectItem value="key">{t("name")}</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="grid gap-2">
        <div className="flex items-center justify-between">
          <div>
            <Label htmlFor="sort-order">{t("sortOrder")}</Label>
            <p className="text-xs text-muted-foreground">
              {t("sortOrderDesc")}
            </p>
          </div>
          <Switch
            id="sort-order"
            checked={currentDisplayOptions.sortOrder === "desc"}
            onCheckedChange={(checked) =>
              handleUpdate({ sortOrder: checked ? "desc" : "asc" })
            }
            disabled={isSearchActive}
            aria-label={t("sortOrderToggle")}
          />
        </div>
      </div>
    </div>
  );
}
