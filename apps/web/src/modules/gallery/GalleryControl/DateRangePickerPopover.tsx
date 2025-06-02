import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { CalendarIcon } from "lucide-react";
import { format, startOfDay, endOfDay, subMonths } from "date-fns";
import type { DateRange } from "react-day-picker";
import { timeRangesGetter } from "../galleryStore";
import { getTimeRange, type DisplayOptions } from "./displayControlStore";
import { useTranslations } from "next-intl";

const TIME_RANGES = timeRangesGetter();

interface DateRangePickerPopoverProps {
  currentDisplayOptions: DisplayOptions;
  handleUpdate: (update: Partial<DisplayOptions>) => void;
}

export function DateRangePickerPopover({
  currentDisplayOptions,
  handleUpdate,
}: DateRangePickerPopoverProps) {
  const [datePickerPopoverOpen, setDatePickerPopoverOpen] = useState(false);
  const t = useTranslations("gallery.date");

  const handleDateRangeSelect = (range: DateRange | undefined) => {
    if (range?.from && range?.to && range.from < range.to) {
      handleUpdate({
        dateRangeType: [startOfDay(range.from), endOfDay(range.to)],
      });
      setDatePickerPopoverOpen(false);
    } else if (range?.from) {
      handleUpdate({
        dateRangeType: [startOfDay(range.from), null],
      });
    } else {
      handleUpdate({ dateRangeType: [null, null] });
    }
  };

  const handlePredefinedDateRange = (
    type: (typeof TIME_RANGES)[number]["type"] | "all",
  ) => {
    if (type === "all") {
      handleUpdate({ dateRangeType: [null, null] });
    } else {
      const selectedRange = TIME_RANGES.find((r) => r.type === type);
      if (selectedRange) {
        handleUpdate({ dateRangeType: type });
      }
    }
    setDatePickerPopoverOpen(false);
  };

  const getDateRangeButtonLabel = () => {
    if (Array.isArray(currentDisplayOptions.dateRangeType)) {
      const [from, to] = currentDisplayOptions.dateRangeType;
      if (from === null && to === null) {
        return t("all");
      }
      return `${from ? format(from, "yyyy-MM-dd") : ""} - ${to ? format(to, "yyyy-MM-dd") : ""}`;
    }
    const range = TIME_RANGES.find(
      (r) => r.type === currentDisplayOptions.dateRangeType,
    );
    return range
      ? `${t("recent")} ${range.type
          .replace(/d$/, t("days"))
          .replace(/m$/, t("months"))
          .replace(/y$/, t("years"))}`
      : t("selectDate");
  };

  const selected = useMemo(() => {
    const [from, to] = getTimeRange(currentDisplayOptions.dateRangeType);
    if (!from && !to) {
      return undefined;
    }
    return {
      from: from || undefined,
      to: to || undefined,
    };
  }, [currentDisplayOptions.dateRangeType]);

  const defaultMonth = useMemo(() => {
    const [from] = getTimeRange(currentDisplayOptions.dateRangeType);
    if (from) {
      return from;
    }
    return subMonths(new Date(), 1);
  }, [currentDisplayOptions.dateRangeType]);

  return (
    <Popover
      open={datePickerPopoverOpen}
      onOpenChange={setDatePickerPopoverOpen}
    >
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className="w-full justify-start text-left font-normal"
        >
          <CalendarIcon className="mr-2 h-4 w-4" />
          {getDateRangeButtonLabel()}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <div className="flex flex-col md:flex-row">
          <div className="flex flex-col space-y-1 border-r p-2">
            <Button
              variant="ghost"
              size="sm"
              className="justify-start"
              onClick={() => handlePredefinedDateRange("all")}
            >
              {t("reset")}
            </Button>
            {TIME_RANGES.map((range) => (
              <Button
                key={range.type}
                variant="ghost"
                size="sm"
                className="justify-start"
                onClick={() => handlePredefinedDateRange(range.type)}
              >
                {t("recent")}{" "}
                {range.type
                  .replace(/d$/, t("days"))
                  .replace(/m$/, t("months"))
                  .replace(/y$/, t("years"))}
              </Button>
            ))}
          </div>
          <div className="w-auto p-0 overflow-y-auto">
            <Calendar
              initialFocus
              mode="range"
              selected={selected}
              defaultMonth={defaultMonth}
              onSelect={(range) => handleDateRangeSelect(range)}
              numberOfMonths={2}
            />
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
