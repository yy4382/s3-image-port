"use client";

import { useAtom, useSetAtom } from "jotai";
import { startTransition, useEffect, useMemo, useState } from "react";
import {
  displayOptionsToSearchParams,
  displayOptionsAtom,
  displayOptionsSchema,
  searchParamsToDisplayOptions,
  type DisplayOptions,
} from "./displayControlStore";
import { currentPageAtom } from "../galleryStore";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { buttonVariants } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { FilterIcon, ArrowUpDownIcon } from "lucide-react";
import { FilterPopoverContent } from "./FilterPopoverContent";
import { SortPopoverContent } from "./SortPopoverContent";
import { NotificationBadge } from "@/components/ui/notification-badge";
import { useTranslations } from "use-intl";
import { getRouteApi } from "@tanstack/react-router";

const route = getRouteApi("/$locale/_root-layout/gallery");

function useSearchDisplayOptions() {
  const navigate = route.useNavigate();
  const searchParams = route.useSearch();

  const setCurrentPage = useSetAtom(currentPageAtom);
  const [displayOptions, setDisplayOptions] = useAtom(displayOptionsAtom);

  const handleUpdate = (
    update:
      | Partial<DisplayOptions>
      | ((prev: DisplayOptions) => Partial<DisplayOptions>),
  ) => {
    let newSearchOptions: Partial<DisplayOptions>;
    if (typeof update === "function") {
      newSearchOptions = update(displayOptionsSchema.parse(displayOptions));
    } else {
      newSearchOptions = update;
    }
    const newSearchParams = displayOptionsToSearchParams({
      ...displayOptions,
      ...newSearchOptions,
    });
    startTransition(() => {
      setCurrentPage(1);
      navigate({
        to: ".",
        search: newSearchParams,
      });
    });
  };

  useEffect(() => {
    const parsedSearchParams = searchParamsToDisplayOptions(searchParams);
    setDisplayOptions(parsedSearchParams);
  }, [setDisplayOptions, searchParams]);

  return {
    search: displayOptions,
    handleUpdate,
  };
}

export function DisplayControl() {
  const { search, handleUpdate } = useSearchDisplayOptions();
  const t = useTranslations("gallery.filter");

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
        placeholder={t("searchPlaceholder")}
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
