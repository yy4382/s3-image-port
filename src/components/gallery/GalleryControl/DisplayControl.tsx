import { getRouteApi, useNavigate } from "@tanstack/react-router";
import { useSetAtom } from "jotai";
import { useEffect, useMemo, useState } from "react";
import {
  photoListDisplayOptionsAtom,
  type PhotoListDisplayOptions,
  photoListDisplayOptionsSchema,
} from "../galleryStore";
import { Input } from "../../ui/input";
import { currentPageAtom } from "../galleryStore";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { FilterIcon, ArrowUpDownIcon } from "lucide-react";
import { FilterPopoverContent } from "./FilterPopoverContent";
import { SortPopoverContent } from "./SortPopoverContent";
import { NotificationBadge } from "@/components/ui/notification-badge";

const route = getRouteApi("/gallery");

function useSearchDisplayOptions() {
  const search = route.useSearch();
  const navigate = useNavigate({ from: "/gallery" });
  const setCurrentPage = useSetAtom(currentPageAtom);
  const handleUpdate = (
    update:
      | Partial<PhotoListDisplayOptions>
      | ((prev: PhotoListDisplayOptions) => Partial<PhotoListDisplayOptions>),
  ) => {
    let newSearchOptions: Partial<PhotoListDisplayOptions>;
    if (typeof update === "function") {
      newSearchOptions = update(photoListDisplayOptionsSchema.parse(search));
    } else {
      newSearchOptions = update;
    }
    setCurrentPage(1);
    navigate({
      search: (prev) => ({ ...prev, ...newSearchOptions }),
    });
  };
  const setOgDisplayOptions = useSetAtom(photoListDisplayOptionsAtom);

  useEffect(() => {
    setOgDisplayOptions(photoListDisplayOptionsSchema.parse(search));
  }, [search, setOgDisplayOptions]);

  return {
    search,
    handleUpdate,
  };
}

export function DisplayControl() {
  const { search, handleUpdate } = useSearchDisplayOptions();

  const [filterPopoverOpen, setFilterPopoverOpen] = useState(false);
  const [sortPopoverOpen, setSortPopoverOpen] = useState(false);

  const isSearchActive = !!search.searchTerm;

  const filterActiveCount = useMemo(() => {
    let count = 0;
    if (search.prefix !== undefined) count++;
    if (search.dateRangeType[0] !== null || search.dateRangeType[1] !== null)
      count++;
    return count;
  }, [search.prefix, search.dateRangeType]);

  return (
    <div className="flex items-center gap-2">
      <Input
        placeholder="搜索..."
        className="flex-grow max-w-72"
        onChange={(e) => {
          handleUpdate({ searchTerm: e.target.value });
        }}
        value={search.searchTerm}
      />
      <Popover open={filterPopoverOpen} onOpenChange={setFilterPopoverOpen}>
        <PopoverTrigger>
          <NotificationBadge
            label={filterActiveCount}
            show={filterActiveCount > 0}
            variant={"destructive"}
          >
            <div className={buttonVariants({ size: "icon" })}>
              <FilterIcon className="h-4 w-4" />
            </div>
          </NotificationBadge>
        </PopoverTrigger>
        <PopoverContent className="w-100">
          <FilterPopoverContent
            currentDisplayOptions={search}
            handleUpdate={handleUpdate}
            setFilterPopoverOpen={setFilterPopoverOpen}
          />
        </PopoverContent>
      </Popover>

      <Popover open={sortPopoverOpen} onOpenChange={setSortPopoverOpen}>
        <PopoverTrigger asChild>
          <Button variant="outline" size="icon">
            <ArrowUpDownIcon className="h-4 w-4" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-80">
          <SortPopoverContent
            currentDisplayOptions={search}
            handleUpdate={handleUpdate}
            isSearchActive={isSearchActive}
            setSortPopoverOpen={setSortPopoverOpen}
          />
        </PopoverContent>
      </Popover>
    </div>
  );
}
