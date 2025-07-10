import { SetStateAction, useMemo } from "react";
import * as z from "zod/v4";
import { FormEntryText } from "@/components/ui/form-entry-validate";
import { useTranslations } from "next-intl";
import { Input } from "@/components/ui/input";
import { motion } from "motion/react";
import { defaultKeyTemplate } from "@/lib/utils/generateKey";
import { RefreshCcw } from "lucide-react";
import { cn } from "@/lib/utils";

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
      description={t.rich("description", {
        more: (chunks) => (
          <a
            href={new URL(
              "/zh/guide/settings-reference#key-template",
              process.env.NEXT_PUBLIC_DOCS_ORIGIN ??
                "https://docs.imageport.app",
            ).toString()}
            target="_blank"
            className="underline underline-offset-1"
          >
            {chunks}
          </a>
        ),
      })}
      value={v}
      setValue={set}
      schema={advancedSchema}
      customInput={({ value, onChange, placeholder }) => (
        <div className="relative">
          <Input
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder}
          />
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
      )}
    />
  );
}
