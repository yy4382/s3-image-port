import { Button } from "@/components/ui/button";
import { useAtomsDebugValue } from "jotai-devtools";
import { Label } from "@/components/ui/label";
import { Check, ChevronsUpDown, XIcon } from "lucide-react";
import { availablePrefixesAtom } from "../galleryStore";
import { type DisplayOptions } from "./displayControlStore";
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
  return (
    <div className="grid gap-4">
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <h4 className="font-medium leading-none">过滤选项</h4>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setFilterPopoverOpen(false)}
          >
            <XIcon className="h-4 w-4" />
          </Button>
        </div>
        <p className="text-sm text-muted-foreground">根据属性筛选图片。</p>
      </div>
      <div className="grid gap-2">
        <Label htmlFor="prefix-filter">按前缀过滤</Label>
        <p className="text-xs text-muted-foreground">
          像在目录树中一样查找图像。
        </p>
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
        <Label>按日期过滤</Label>
        <p className="text-xs text-muted-foreground">
          点击以打开日历选择日期范围。
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
  useAtomsDebugValue();

  const currentPrefix = currentDisplayOptions.prefix;
  const currentDisplayPrefix =
    currentPrefix === ""
      ? "(no prefix)"
      : currentPrefix === undefined
        ? "Select prefix..."
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
          <CommandInput placeholder="Search prefix..." className="h-9" />
          <CommandList>
            <CommandEmpty>No prefix found.</CommandEmpty>
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
                  {prefixItem.name || "(no prefix)"}
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
