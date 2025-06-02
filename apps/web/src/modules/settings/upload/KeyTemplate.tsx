import { SetStateAction, useMemo } from "react";
import * as z from "zod/v4";
import { FormEntryText } from "@/components/ui/form-entry-validate";
import { useTranslations } from "next-intl";

export const keyTemplateSchema = z
  .string()
  .min(1, "Key template cannot be empty");

export function KeyTemplate({
  v,
  set,
}: {
  v: string;
  set: (v: SetStateAction<string>) => void;
}) {
  const t = useTranslations("settings.keyTemplate");
  const advancedSchema = useMemo(
    () =>
      keyTemplateSchema
        .refine(
          (v) => {
            return v.trim().endsWith(".{{ext}}");
          },
          { error: t("endWithExtWarning") },
        )
        .refine(
          (v) => {
            return !v.includes("{{random}}");
          },
          {
            error: t("deprecatedPlaceholderWarning", {
              placeholder: "{{random}}",
              instead: "{{ulid-dayslice}}",
            }),
          },
        ),
    [t],
  );

  return (
    <FormEntryText
      title={t("title")}
      description={t("description")}
      value={v}
      setValue={set}
      schema={advancedSchema}
    />
  );
}
