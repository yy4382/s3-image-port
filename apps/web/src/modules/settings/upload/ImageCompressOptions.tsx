import * as React from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch"; // Import Switch
import type { CompressOption } from "@/lib/utils/imageCompress"; // Adjust the import path as needed
import { useTranslations } from "next-intl";

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
    <div className="space-y-4">
      {/* Enable/Disable Switch */}
      <div className="flex items-center space-x-2">
        <Label htmlFor="enable-processing">{t("enable")}</Label>
        <Switch
          id="enable-processing"
          checked={isProcessingEnabled}
          onCheckedChange={handleEnabledChange}
        />
      </div>

      {/* Format Selection - Disabled if not enabled */}
      <div>
        <Label
          htmlFor="image-type-select"
          className={!isProcessingEnabled ? "text-muted-foreground" : ""}
        >
          {t("targetFormat")}
        </Label>
        <Select
          value={currentType}
          onValueChange={(newVal: CompressOption["type"]) =>
            handleTypeChange(newVal)
          }
          disabled={!isProcessingEnabled}
        >
          <SelectTrigger
            id="image-type-select"
            disabled={!isProcessingEnabled}
            className="mt-2"
          >
            <SelectValue placeholder={t("selectFormat")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="avif">AVIF</SelectItem>
            <SelectItem value="jpeg">JPEG</SelectItem>
            <SelectItem value="webp">WebP</SelectItem>
            <SelectItem value="png">PNG</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Quality Slider - Shown only for relevant types and if enabled */}
      {isProcessingEnabled &&
        quality !== undefined &&
        currentType !== "png" && (
          <div>
            <Label htmlFor="quality-slider">{t("quality", { quality })}</Label>
            <Slider
              id="quality-slider"
              min={0}
              max={100}
              step={1}
              value={[quality]}
              onValueChange={handleQualityChange}
              className="mt-2"
              disabled={!isProcessingEnabled} // Technically redundant due to outer check, but safe
            />
          </div>
        )}
    </div>
  );
};

export default ImageCompressOptions;
