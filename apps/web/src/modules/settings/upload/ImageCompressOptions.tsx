import * as React from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/animate-ui/components/base/switch";
import type { CompressOption } from "@/lib/utils/imageCompress"; // Adjust the import path as needed
import { useTranslations } from "use-intl";
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldLabel,
  FieldSet,
} from "@/components/ui/field";
import { NumberField } from "@base-ui/react/number-field";
import { MoveHorizontalIcon } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const PROCESS_OPTION_DEFAULTS = {
  jpeg: { quality: 75 },
  webp: { quality: 75 },
  avif: { quality: 50 },
  png: {},
};

interface ImageProcessOptionsProps {
  value: CompressOption | null; // Allow null
  onChange: (value: CompressOption | null) => void; // Allow null
}

// Define a default option for when processing is re-enabled
const defaultProcessOption: CompressOption = { type: "jpeg", quality: 75 };

const ImageCompressOptions: React.FC<ImageProcessOptionsProps> = ({
  value,
  onChange,
}) => {
  const t = useTranslations("settings.imageCompress");
  const isProcessingEnabled = value !== null;

  const handleEnabledChange = (enabled: boolean) => {
    if (enabled) {
      // When enabling, use the default or potentially the last known setting if stored
      onChange(defaultProcessOption);
    } else {
      onChange(null); // Disable processing
    }
  };

  const handleTypeChange = (newType: CompressOption["type"]) => {
    if (!isProcessingEnabled) return; // Should not happen if disabled, but good practice

    if (newType === "png") {
      onChange({ type: "png" });
    } else {
      onChange({ type: newType, ...PROCESS_OPTION_DEFAULTS[newType] });
    }
  };

  const handleQualityChange = (quality: number[]) => {
    if (!isProcessingEnabled || !value || value.type === "png") return; // Ensure value is not null and has quality
    onChange({ ...value, quality: quality[0] });
  };

  // Determine quality, safely accessing value
  const quality =
    isProcessingEnabled && value && "quality" in value
      ? value.quality
      : undefined;
  const currentType = isProcessingEnabled ? value.type : undefined;

  return (
    <FieldSet>
      {/* <FieldLegend>{t("title")}</FieldLegend>
      <FieldDescription>{t("description")}</FieldDescription> */}
      {/* Enable/Disable Switch */}
      <Field orientation="horizontal">
        <FieldContent>
          <FieldLabel htmlFor="enable-processing">{t("title")}</FieldLabel>
          <FieldDescription>
            {t("description")} {t("enableDesc")}
          </FieldDescription>
        </FieldContent>
        <Switch
          id="enable-processing"
          checked={isProcessingEnabled}
          onCheckedChange={handleEnabledChange}
        />
      </Field>

      {isProcessingEnabled && (
        <Field className="gap-1">
          <FieldLabel htmlFor="image-type-select">
            {t("targetFormat")}
          </FieldLabel>
          <Select
            value={currentType}
            onValueChange={(newVal) => {
              if (!newVal) return;
              handleTypeChange(newVal);
            }}
            itemToStringLabel={(item) =>
              item.toUpperCase() ?? t("selectFormat")
            }
          >
            <SelectTrigger id="image-type-select">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="avif">AVIF</SelectItem>
              <SelectItem value="jpeg">JPEG</SelectItem>
              <SelectItem value="webp">WebP</SelectItem>
              <SelectItem value="png">PNG</SelectItem>
            </SelectContent>
          </Select>
        </Field>
      )}

      {/* Quality Slider - Shown only for relevant types and if enabled */}
      {isProcessingEnabled &&
        quality !== undefined &&
        currentType !== "png" && (
          <div>
            <NumberField.Root
              id="quality-slider"
              min={1}
              max={100}
              step={1}
              value={quality}
              onValueChange={(value) => handleQualityChange([value ?? 75])}
              snapOnStep={true}
            >
              <Field className="gap-1">
                <NumberField.ScrubArea className="cursor-ew-resize w-fit!">
                  <FieldLabel
                    htmlFor="quality-slider"
                    className="cursor-ew-resize text-sm font-medium text-gray-900"
                  >
                    {t("quality")}
                  </FieldLabel>
                  <NumberField.ScrubAreaCursor className="drop-shadow-[0_1px_1px_#0008] filter">
                    <MoveHorizontalIcon />
                  </NumberField.ScrubAreaCursor>
                </NumberField.ScrubArea>
                <NumberField.Group className="shadow-xs max-w-fit rounded-md">
                  <NumberField.Decrement
                    className={cn(
                      buttonVariants({
                        size: "icon",
                        variant: "outline",
                      }),
                      "rounded-r-none shadow-none",
                    )}
                  >
                    -
                  </NumberField.Decrement>
                  <NumberField.Input className="placeholder:text-muted-foreground selection:bg-primary selection:text-primary-foreground dark:bg-input/30 h-9 w-18 min-w-0 text-center border-y border-input bg-transparent px-3 py-1 text-base transition-[color,box-shadow] outline-none disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 md:text-sm" />
                  <NumberField.Increment
                    className={cn(
                      buttonVariants({
                        size: "icon",
                        variant: "outline",
                      }),
                      "rounded-l-none shadow-none",
                    )}
                  >
                    +
                  </NumberField.Increment>
                </NumberField.Group>
                <FieldDescription>{t("qualityDesc")}</FieldDescription>
              </Field>
            </NumberField.Root>
          </div>
        )}
    </FieldSet>
  );
};

export default ImageCompressOptions;
