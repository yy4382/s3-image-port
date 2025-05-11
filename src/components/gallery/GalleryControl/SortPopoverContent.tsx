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
import type { DisplayOptions } from "./displayControlStore";

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
  return (
    <div className="grid gap-4">
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <h4 className="font-medium leading-none">排序选项</h4>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setSortPopoverOpen(false)}
          >
            <XIcon className="h-4 w-4" />
          </Button>
        </div>
        <p className="text-sm text-muted-foreground">
          {isSearchActive
            ? "搜索已激活，排序选项已禁用。图片将按搜索匹配度排序。"
            : "选择图片的排序方式。"}
        </p>
      </div>
      <div className="grid gap-2">
        <Label htmlFor="sort-by">按 ... 排序</Label>
        <p className="text-xs text-muted-foreground">排序所依据的属性。</p>
        <Select
          value={currentDisplayOptions.sortBy}
          onValueChange={(value: "key" | "date") =>
            handleUpdate({ sortBy: value })
          }
          disabled={isSearchActive}
        >
          <SelectTrigger id="sort-by" disabled={isSearchActive}>
            <SelectValue placeholder="选择属性" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="date">日期</SelectItem>
            <SelectItem value="key">名称 (路径)</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="grid gap-2">
        <div className="flex items-center justify-between">
          <div>
            <Label htmlFor="sort-order">升降序</Label>
            <p className="text-xs text-muted-foreground">
              以升序或降序显示结果。
            </p>
          </div>
          <Switch
            id="sort-order"
            checked={currentDisplayOptions.sortOrder === "desc"}
            onCheckedChange={(checked) =>
              handleUpdate({ sortOrder: checked ? "desc" : "asc" })
            }
            disabled={isSearchActive}
            aria-label="排序顺序切换"
          />
        </div>
      </div>
    </div>
  );
}
