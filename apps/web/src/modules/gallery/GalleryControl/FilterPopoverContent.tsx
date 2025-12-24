import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { CheckIcon, XIcon, ChevronsUpDownIcon } from "lucide-react";
import { availablePrefixesAtom } from "../hooks/use-photo-list";
import { GalleryFilterOptions as DisplayOptions } from "@/stores/schemas/gallery/filter";
import { DateRangePickerPopover } from "./DateRangePickerPopover";
import { useAtomValue } from "jotai";
import { useTranslations } from "use-intl";
import { Input } from "@/components/ui/input";
import { Combobox } from "@base-ui/react";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
} from "@/components/ui/input-group";
import { useMemo } from "react";

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
  const t = useTranslations("gallery.filter");
  const availablePrefixes = useAtomValue(availablePrefixesAtom);
  const itemToStringValue = (prefix: (typeof availablePrefixes)[number]) => {
    return prefix.name === "" ? t("noPrefix") : prefix.name;
  };
  const currentPrefixName = useMemo(
    () => currentDisplayOptions.prefix,
    [currentDisplayOptions.prefix],
  );
  const currentPrefix = useMemo(() => {
    return availablePrefixes.find((p) => p.name === currentPrefixName) ?? null;
  }, [currentPrefixName, availablePrefixes]);
  return (
    <div className="flex items-center gap-2">
      <Combobox.Root
        items={availablePrefixes}
        itemToStringValue={itemToStringValue}
        itemToStringLabel={itemToStringValue}
        value={currentPrefix}
        onValueChange={(value) => {
          console.log(value);
          handleUpdate({ prefix: value?.name });
        }}
      >
        <Combobox.Trigger className="flex flex-1 transition-colors bg-transparent dark:bg-input/30 dark:hover:bg-input/50 h-9 min-w-[12rem] items-center justify-between gap-3 rounded-md border shadow-xs border-input px-3 select-none hover:bg-popover focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] outline-none cursor-default">
          <span className="text-sm text-foreground">
            {(() => {
              switch (currentPrefixName) {
                case undefined:
                  return (
                    <span className="text-muted-foreground">
                      {t("selectPrefix")}
                    </span>
                  );
                case "":
                  return t("noPrefix");
                default:
                  return currentPrefixName;
              }
            })()}
          </span>
          <Combobox.Icon className="flex size-5 items-center">
            <ChevronsUpDownIcon />
          </Combobox.Icon>
        </Combobox.Trigger>
        <Combobox.Portal>
          <Combobox.Positioner
            align="start"
            sideOffset={4}
            className="z-60 isolate"
          >
            <Combobox.Popup
              data-slot="combobox-content"
              className="origin-(--transform-origin) max-w-(--available-width) group/combobox-content max-h-[24rem] rounded-md ring-foreground/10 ring-1 *:data-[slot=input-group]:shadow-none bg-popover text-popover-foreground shadow-md shadow-gray-200 outline-1 outline-gray-200 transition-[transform,scale,opacity] data-ending-style:scale-90 data-ending-style:opacity-0 data-starting-style:scale-90 data-starting-style:opacity-0 dark:shadow-none dark:-outline-offset-1 dark:outline-gray-300"
              aria-label="Select country"
            >
              <div className="w-full h-2"></div>
              <InputGroup className="w-auto mx-2">
                <Combobox.Input render={<InputGroupInput />} />

                <InputGroupAddon align="inline-end">
                  <Combobox.Clear
                    data-slot="combobox-clear"
                    render={<InputGroupButton variant="ghost" size="icon-xs" />}
                  >
                    <XIcon className="pointer-events-none" />
                  </Combobox.Clear>
                </InputGroupAddon>
              </InputGroup>
              <Combobox.Empty className="text-muted-foreground hidden w-full justify-center py-2 text-center text-sm group-data-empty/combobox-content:flex">
                {t("noPrefixFound")}
              </Combobox.Empty>
              <Combobox.List className="mt-2 max-h-[min(calc(--spacing(72)---spacing(9)),calc(var(--available-height)---spacing(9)))] scroll-py-1 p-1 data-empty:p-0 overflow-y-auto overscroll-contain">
                {(prefix: (typeof availablePrefixes)[number]) => (
                  <Combobox.Item
                    key={prefix.name}
                    value={prefix}
                    className="data-highlighted:bg-accent data-highlighted:text-accent-foreground not-data-[variant=destructive]:data-highlighted:**:text-accent-foreground min-w-(--anchor-width) gap-2 rounded-sm py-1.5 pr-8 pl-2 text-sm [&_svg:not([class*='size-'])]:size-4 relative flex w-full cursor-default items-center outline-hidden select-none data-disabled:pointer-events-none data-disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0"
                  >
                    <Combobox.ItemIndicator
                      render={
                        <span className="pointer-events-none absolute right-2 flex size-4 items-center justify-center" />
                      }
                    >
                      <CheckIcon className="pointer-events-none" />
                    </Combobox.ItemIndicator>
                    <div
                      className="col-start-2"
                      style={{ paddingLeft: prefix.hierarchy + 0.25 + "rem" }}
                    >
                      {itemToStringValue(prefix)}
                    </div>
                  </Combobox.Item>
                )}
              </Combobox.List>
            </Combobox.Popup>
          </Combobox.Positioner>
        </Combobox.Portal>
      </Combobox.Root>
      <Button
        variant="outline"
        size="icon"
        disabled={currentPrefix === null}
        onClick={() => handleUpdate({ prefix: undefined })}
      >
        <XIcon className="size-5" />
      </Button>
    </div>
  );
}
