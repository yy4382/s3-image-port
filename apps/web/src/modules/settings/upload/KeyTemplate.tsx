import { useState } from "react";
import { z } from "zod/v4";
import { useTranslations } from "use-intl";
import { Input } from "@/components/ui/input";
import { motion } from "motion/react";
import { defaultKeyTemplate } from "@/lib/utils/generateKey";
import { RefreshCcw } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Field,
  FieldDescription,
  FieldError,
  FieldLabel,
} from "@/components/ui/field";
import { Link } from "@tanstack/react-router";

export const keyTemplateSchema = z
  .string()
  .min(1, "Key template cannot be empty");

export function KeyTemplateForm({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  const t = useTranslations("settings.keyTemplate");
  const [error, setError] = useState<{ message: string }[] | undefined>(
    undefined,
  );
  const [warning, setWarning] = useState<string | undefined>(undefined);

  function handleChange(value: string) {
    const result = keyTemplateSchema.safeParse(value);
    onChange(value);
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
  }

  return (
    <Field data-invalid={error !== undefined} className="gap-1">
      <FieldLabel>{t("title")}</FieldLabel>
      <div className="relative">
        <Input value={value} onChange={(e) => handleChange(e.target.value)} />
        <motion.button
          type="button"
          onClick={() => onChange(defaultKeyTemplate)}
          className={cn(
            "absolute inset-y-0 end-0 flex h-full w-9 items-center justify-center rounded-e-lg text-muted-foreground/80 outline-offset-2 transition-colors hover:text-foreground focus:z-10 focus-visible:outline-2 focus-visible:outline-ring/70 disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50",
            value === defaultKeyTemplate && "hidden",
          )}
          aria-label="Reset to default"
          whileHover={{
            scale: 1.1,
          }}
          whileTap={{
            scale: 0.9,
          }}
        >
          <RefreshCcw size={16} strokeWidth={2} aria-hidden="true" />
        </motion.button>
      </div>
      <FieldDescription>
        {t.rich("description", {
          more: (chunks) => (
            <Link
              from="/$locale"
              to="/$locale/docs/$"
              params={({ locale }) => ({
                locale,
                _splat: "settings-reference",
              })}
              hash="key-template"
              target="_blank"
              className="underline underline-offset-1"
            >
              {chunks}
            </Link>
          ),
        })}
      </FieldDescription>
      {error && <FieldError errors={error} />}
      {warning && (
        <FieldError
          errors={[{ message: warning }]}
          className="text-orange-500"
        />
      )}
    </Field>
  );
}

export function KeyTemplateIndependent({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  return <KeyTemplateForm value={value} onChange={onChange} />;
}
