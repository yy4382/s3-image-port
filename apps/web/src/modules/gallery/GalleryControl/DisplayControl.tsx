"use client";

import { useAtom, useAtomValue, useSetAtom } from "jotai";
import {
  startTransition,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  galleryFilterOptionsToSearchParams,
  galleryFilterOptionsFromSearchParams,
} from "../hooks/use-display-control";
import { imageCatalog } from "@/modules/image-catalog";
import {
  galleryPageSizeDefault,
  galleryPageSizeSchema,
} from "@/stores/schemas/gallery/filter";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { buttonVariants } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { FilterIcon, ArrowUpDownIcon } from "lucide-react";
import { FilterPopoverContent } from "./FilterPopoverContent";
import { SortPopoverContent } from "./SortPopoverContent";
import { NotificationBadge } from "@/components/ui/notification-badge";
import { useTranslations } from "use-intl";
import { getRouteApi, useRouterState } from "@tanstack/react-router";
import deepEqual from "fast-deep-equal";

const route = getRouteApi("/$locale/_root-layout/gallery");

function useSyncDisplayAtomAndSearch() {
  const searchParams = route.useSearch();
  const routeNavigationId = useRouterState({
    select: ({ location }) =>
      (
        location.state as typeof location.state & {
          galleryDisplayNavigationId?: number;
        }
      ).galleryDisplayNavigationId,
  });
  const routeLocationKey = useRouterState({
    select: ({ location }) => location.state.__TSR_key,
  });
  const navigate = route.useNavigate();
  const setDisplayOptions = useSetAtom(imageCatalog.view.filter);
  const setCurrentPage = useSetAtom(imageCatalog.view.page);
  const setPageSize = useSetAtom(imageCatalog.view.pageSize);

  const displayOptions = useAtomValue(imageCatalog.view.filter);
  const pageSize = useAtomValue(imageCatalog.view.pageSize);
  const normalizedRoute = useMemo(() => {
    const filter = galleryFilterOptionsFromSearchParams(searchParams);
    const size = galleryPageSizeSchema
      .catch(galleryPageSizeDefault)
      .parse(searchParams.pageSize);
    return {
      filter,
      pageSize: size,
      search: galleryFilterOptionsToSearchParams(filter, size),
    };
  }, [searchParams]);
  const catalogSearch = useMemo(
    () => galleryFilterOptionsToSearchParams(displayOptions, pageSize),
    [displayOptions, pageSize],
  );
  const routeKey = JSON.stringify(normalizedRoute.search);
  const routeIsCanonical = deepEqual(searchParams, normalizedRoute.search);
  const catalogKey = JSON.stringify(catalogSearch);
  const observedRouteKey = useRef<string | undefined>(undefined);
  const observedLocationKey = useRef<string | undefined>(undefined);
  const suppressedLocationKey = useRef<string | undefined>(undefined);
  const hydratingRouteKey = useRef<string | undefined>(undefined);
  const nextNavigationId = useRef(0);
  const pendingOutbound = useRef<{ id: number; key: string } | undefined>(
    undefined,
  );
  const invalidatedOutbound = useRef(
    new Map<
      number,
      {
        key: string;
        staleLocationKey?: string;
        eligibleAfterLocationKey?: string;
      }
    >(),
  );

  const navigateOutbound = useCallback(
    (search: typeof catalogSearch, key: string, replace = false) => {
      if (pendingOutbound.current) {
        invalidatedOutbound.current.set(pendingOutbound.current.id, {
          key: pendingOutbound.current.key,
        });
      }
      // Only in-flight, invalidated navigations are retained. The cap also keeps
      // a navigation that never acknowledges from growing module-local state.
      while (invalidatedOutbound.current.size > 16) {
        invalidatedOutbound.current.delete(
          invalidatedOutbound.current.keys().next().value!,
        );
      }
      const id = ++nextNavigationId.current;
      pendingOutbound.current = { id, key };
      startTransition(() => {
        void navigate({
          to: ".",
          search,
          ...(replace ? { replace: true } : {}),
          state: (previous) => ({
            ...previous,
            galleryDisplayNavigationId: id,
          }),
        });
      });
    },
    [navigate],
  );

  useEffect(() => {
    if (
      observedRouteKey.current === routeKey &&
      observedLocationKey.current === routeLocationKey &&
      suppressedLocationKey.current === routeLocationKey
    ) {
      return;
    }

    if (
      observedRouteKey.current !== routeKey ||
      observedLocationKey.current !== routeLocationKey
    ) {
      observedRouteKey.current = routeKey;
      observedLocationKey.current = routeLocationKey;
      suppressedLocationKey.current = undefined;
      const pending = pendingOutbound.current;

      if (
        pending !== undefined &&
        pending.id === routeNavigationId &&
        pending.key === routeKey
      ) {
        pendingOutbound.current = undefined;
        hydratingRouteKey.current = undefined;
        return;
      }

      if (routeNavigationId !== undefined) {
        const invalidated = invalidatedOutbound.current.get(routeNavigationId);
        if (invalidated?.key === routeKey) {
          if (
            invalidated.eligibleAfterLocationKey !== undefined &&
            invalidated.staleLocationKey === routeLocationKey
          ) {
            invalidatedOutbound.current.delete(routeNavigationId);
          } else {
            invalidated.staleLocationKey ??= routeLocationKey;
            suppressedLocationKey.current = routeLocationKey;
            return;
          }
        }
      }

      if (pendingOutbound.current) {
        invalidatedOutbound.current.set(pendingOutbound.current.id, {
          key: pendingOutbound.current.key,
        });
        pendingOutbound.current = undefined;
      }

      for (const invalidated of invalidatedOutbound.current.values()) {
        if (invalidated.staleLocationKey !== undefined) {
          invalidated.eligibleAfterLocationKey = routeLocationKey;
        }
      }

      hydratingRouteKey.current = routeKey;
      if (catalogKey !== routeKey) {
        setCurrentPage(1);
        setDisplayOptions(normalizedRoute.filter);
        setPageSize(normalizedRoute.pageSize);
        return;
      }

      hydratingRouteKey.current = undefined;
      if (!routeIsCanonical) {
        navigateOutbound(normalizedRoute.search, routeKey, true);
      }
      return;
    }

    if (hydratingRouteKey.current === routeKey) {
      if (catalogKey !== routeKey) return;
      hydratingRouteKey.current = undefined;
      if (!routeIsCanonical) {
        navigateOutbound(normalizedRoute.search, routeKey, true);
      }
      return;
    }

    if (
      catalogKey === routeKey ||
      pendingOutbound.current?.key === catalogKey
    ) {
      return;
    }

    setCurrentPage(1);
    navigateOutbound(catalogSearch, catalogKey);
  }, [
    catalogKey,
    catalogSearch,
    navigate,
    normalizedRoute.filter,
    normalizedRoute.pageSize,
    normalizedRoute.search,
    navigateOutbound,
    routeIsCanonical,
    routeKey,
    routeLocationKey,
    routeNavigationId,
    setCurrentPage,
    setDisplayOptions,
    setPageSize,
  ]);
}

export function DisplayControl() {
  const [search, handleUpdate] = useAtom(imageCatalog.view.filter);
  useSyncDisplayAtomAndSearch();
  const tFilter = useTranslations("gallery.filter");
  const tSort = useTranslations("gallery.sort");

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
        placeholder={tFilter("searchPlaceholder")}
        className="grow max-w-72"
        onChange={(e) => {
          handleUpdate((prev) => ({ ...prev, searchTerm: e.target.value }));
        }}
        value={search.searchTerm}
      />
      <Popover open={filterPopoverOpen} onOpenChange={setFilterPopoverOpen}>
        <Tooltip>
          <TooltipTrigger
            render={
              <PopoverTrigger>
                <NotificationBadge
                  label={filterActiveCount}
                  show={filterActiveCount > 0}
                  variant={"destructiveBackground"}
                >
                  <div className={buttonVariants({ size: "icon" })}>
                    <FilterIcon className="h-4 w-4" />
                  </div>
                </NotificationBadge>
              </PopoverTrigger>
            }
          />
          <TooltipContent>{tFilter("filterOptions")}</TooltipContent>
        </Tooltip>
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
        <Tooltip>
          <TooltipTrigger
            render={
              <PopoverTrigger
                render={
                  <Button
                    aria-label={tSort("sortOptions")}
                    variant="outline"
                    size="icon"
                  >
                    <ArrowUpDownIcon className="h-4 w-4" />
                  </Button>
                }
              />
            }
          />
          <TooltipContent>{tSort("sortOptions")}</TooltipContent>
        </Tooltip>
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
