import { useCallback, useState } from "react";
import { useTranslations } from "use-intl";
import { optionsSchema } from "@/stores/schemas/settings";
import { z } from "zod";

const keyTemplateSchema = optionsSchema.shape.upload.shape.keyTemplate;

export type KeyTemplatePreset = NonNullable<
  z.infer<typeof optionsSchema.shape.upload.shape.keyTemplatePresets>
>[number];

export type KeyTemplateFieldInputProps = {
  value: string;
  onChange: (value: string) => void;
};

export function useKeyTemplateValidation() {
  const t = useTranslations("settings.keyTemplate");
  const [error, setError] = useState<{ message: string }[] | undefined>(
    undefined,
  );
  const [warning, setWarning] = useState<string | undefined>(undefined);

  // TODO: add unrecognized {{}} placeholder warning
  const validate = useCallback(
    (value: string) => {
      const result = keyTemplateSchema.safeParse(value);
      if (!result.success) {
        setError(result.error.issues);
        setWarning(undefined);
        return;
      }
      setError(undefined);
      if (!value.trim().endsWith(".{{ext}}")) {
        setWarning(t("endWithExtWarning"));
        return;
      }
      if (value.includes("{{random}}")) {
        setWarning(
          t("deprecatedPlaceholderWarning", {
            placeholder: "{{random}}",
            instead: "{{ulid-dayslice}}",
          }),
        );
        return;
      }
      setWarning(undefined);
    },
    [t],
  );

  return { error, warning, validate };
}
