"use client";

import { useAtom, useAtomValue, useSetAtom } from "jotai";
import { startTransition, useEffect, useMemo, useRef, useState } from "react";
import {
  displayOptionsToSearchParams,
  displayOptionsAtom,
  searchParamsToDisplayOptions,
} from "../hooks/use-display-control";
import { currentPageAtom } from "../hooks/use-photo-list";
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
import equal from "fast-deep-equal";

const route = getRouteApi("/$locale/_root-layout/gallery");

function useSyncDisplayAtomToSearchParams() {
  const navigate = route.useNavigate();
  const setCurrentPage = useSetAtom(currentPageAtom);

  const displayOptions = useAtomValue(displayOptionsAtom);
  const lastDisplayOptionsRef = useRef<typeof displayOptions>(displayOptions);
  useEffect(() => {
    const lastDisplayOptions = lastDisplayOptionsRef.current;
    if (!equal(lastDisplayOptions, displayOptions)) {
      const search = displayOptionsToSearchParams(displayOptions);
      startTransition(() => {
        setCurrentPage(1);
        navigate({ to: ".", search: search });
      });
    }
    lastDisplayOptionsRef.current = displayOptions;
  }, [displayOptions, navigate, setCurrentPage]);
}

function useSyncSearchParamsToDisplayAtom() {
  const searchParams = route.useSearch();
  const setDisplayOptions = useSetAtom(displayOptionsAtom);
  const setCurrentPage = useSetAtom(currentPageAtom);
  const lastSearchParamsRef = useRef<typeof searchParams | null>(null);
  useEffect(() => {
    const lastSearchParams = lastSearchParamsRef.current;
    if (!equal(lastSearchParams, searchParams)) {
      setCurrentPage(1);
      setDisplayOptions(searchParamsToDisplayOptions(searchParams));
    }
    lastSearchParamsRef.current = searchParams;
  }, [searchParams, setDisplayOptions, setCurrentPage]);
}

function useSyncDisplayAtomAndSearch() {
  useSyncSearchParamsToDisplayAtom();
  useSyncDisplayAtomToSearchParams();
}

export function DisplayControl() {
  const [search, handleUpdate] = useAtom(displayOptionsAtom);
  useSyncDisplayAtomAndSearch();
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
        className="grow max-w-72"
        onChange={(e) => {
          handleUpdate((prev) => ({ ...prev, searchTerm: e.target.value }));
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
            handleUpdate={(update) =>
              handleUpdate((prev) => ({ ...prev, ...update }))
            }
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
            handleUpdate={(update) =>
              handleUpdate((prev) => ({ ...prev, ...update }))
            }
            isSearchActive={isSearchActive}
            setSortPopoverOpen={setSortPopoverOpen}
          />
        </PopoverContent>
      </Popover>
    </div>
  );
}
