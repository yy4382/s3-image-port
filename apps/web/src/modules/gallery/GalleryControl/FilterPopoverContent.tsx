import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Check, ChevronsUpDown, XIcon } from "lucide-react";
import { availablePrefixesAtom } from "../use-photo-list";
import { type DisplayOptions } from "../use-display-control";
import { DateRangePickerPopover } from "./DateRangePickerPopover";
import { useAtomValue } from "jotai";
import { useState } from "react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { cn } from "@/lib/utils";
import { useTranslations } from "use-intl";
import { Input } from "@/components/ui/input";

interface FilterPopoverContentProps {
  currentDisplayOptions: DisplayOptions;
  handleUpdate: (update: Partial<DisplayOptions>) => void;
  setFilterPopoverOpen: (open: boolean) => void;
}

export function FilterPopoverContent({
  currentDisplayOptions,
  handleUpdate,
  setFilterPopoverOpen,
}: FilterPopoverContentProps) {
  const t = useTranslations("gallery.filter");

  return (
    <div className="grid gap-4">
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <h4 className="font-medium leading-none">{t("filterOptions")}</h4>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setFilterPopoverOpen(false)}
          >
            <XIcon className="h-4 w-4" />
          </Button>
        </div>
        <p className="text-sm text-muted-foreground">{t("filterByProperty")}</p>
      </div>
      <div className="grid gap-2">
        <Label htmlFor="search-filter">{t("search")}</Label>
        <Input
          id="search-filter"
          placeholder={t("searchPlaceholder")}
          value={currentDisplayOptions.searchTerm}
          onChange={(e) => handleUpdate({ searchTerm: e.target.value })}
        />
      </div>
      <div className="grid gap-2">
        <Label htmlFor="prefix-filter">{t("filterByPrefix")}</Label>
        <p className="text-xs text-muted-foreground">{t("directoryTree")}</p>
        {/* <Input
          id="prefix-filter"
          placeholder="例如: i/2024/05/"
          value={currentDisplayOptions.prefix}
          onChange={(e) => handleUpdate({ prefix: e.target.value })}
        /> */}
        <PrefixSelector
          currentDisplayOptions={currentDisplayOptions}
          handleUpdate={handleUpdate}
        />
      </div>
      <div className="grid gap-2">
        <Label>{t("filterByDate")}</Label>
        <p className="text-xs text-muted-foreground">
          {t("clickToOpenCalendar")}
        </p>
        <DateRangePickerPopover
          currentDisplayOptions={currentDisplayOptions}
          handleUpdate={handleUpdate}
        />
      </div>
    </div>
  );
}

type PrefixSelectorProps = Omit<
  FilterPopoverContentProps,
  "setFilterPopoverOpen"
>;

function PrefixSelector({
  currentDisplayOptions,
  handleUpdate,
}: PrefixSelectorProps) {
  const availablePrefixes = useAtomValue(availablePrefixesAtom);
  const [open, setOpen] = useState(false);
  const setValue = (value: string | undefined) => {
    handleUpdate({ prefix: value });
  };
  const t = useTranslations("gallery.filter");

  const currentPrefix = currentDisplayOptions.prefix;
  const currentDisplayPrefix =
    currentPrefix === ""
      ? t("noPrefix")
      : currentPrefix === undefined
        ? t("selectPrefix")
        : currentPrefix;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between"
        >
          {currentDisplayPrefix}
          <ChevronsUpDown className="opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[200px] p-0">
        <Command>
          <CommandInput placeholder={t("searchPrefix")} className="h-9" />
          <CommandList>
            <CommandEmpty>{t("noPrefixFound")}</CommandEmpty>
            <CommandGroup>
              {availablePrefixes.map((prefixItem) => (
                <CommandItem
                  key={prefixItem.name}
                  value={prefixItem.name}
                  onSelect={(currentValue) => {
                    setValue(
                      currentValue === currentPrefix ? undefined : currentValue,
                    );
                    setOpen(false);
                  }}
                  style={{ paddingLeft: prefixItem.hierarchy + 0.5 + "rem" }}
                >
                  {prefixItem.name || t("noPrefix")}
                  <Check
                    className={cn(
                      "ml-auto",
                      currentPrefix === prefixItem.name
                        ? "opacity-100"
                        : "opacity-0",
                    )}
                  />
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
