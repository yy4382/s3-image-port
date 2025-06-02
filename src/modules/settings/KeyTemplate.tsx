"use client";

import { useId, useState } from "react";
import * as z from "zod/v4";
import { FormEntry } from "@/components/ui/formEntry";
import { Input } from "@/components/ui/input";
import { useTranslations } from "next-intl";

export const keyTemplateSchema = z
  .string()
  .min(1, "Key template cannot be empty");

export function KeyTemplate({ v, set }: { v: string; set(a: string): void }) {
  const t = useTranslations("settings.keyTemplate");
  const [error, setError] = useState<string | undefined>(undefined);
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    set(value);
    const result = keyTemplateSchema.safeParse(value);
    if (result.success) {
      if (!value.trim().endsWith(".{{ext}}")) {
        setError(t("endWithExtWarning"));
        return;
      }
      // TODO: add other checks (deprecated placeholders, "ulid-dayslice" should use with y/m/d etc.)
      setError(undefined);
    } else {
      setError(z.prettifyError(result.error));
    }
  };
  const id = useId();
  return (
    <FormEntry
      id={id}
      title={t("title")}
      description={t("description")}
      error={error}
    >
      <Input id={id} value={v} onChange={handleChange} />
    </FormEntry>
  );
}
