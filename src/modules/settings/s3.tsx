"use client";

import { FormEntry } from "@/components/ui/formEntry";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { getAndParseCors } from "@/lib/utils/testS3Settings";
import {
  useAtomValue,
  type WritableAtom,
  type SetStateAction,
  useAtom,
} from "jotai";
import { useId, useState, type JSX } from "react";
import * as z from "zod/v4";
import { Button } from "@/components/ui/button";
import { focusAtom } from "jotai-optics";
import {
  s3SettingsAtom,
  s3SettingsSchema,
  type S3Options,
} from "./settingsStore";
import { useTranslations } from "next-intl";
import { useValidateInputAtom } from "@/lib/hooks/validate-input";
import { Label } from "@/components/ui/label";

function getS3Part(opt: keyof S3Options) {
  return {
    schema: s3SettingsSchema.shape[opt],
    atom: focusAtom(s3SettingsAtom, (optic) => optic.prop(opt)),
  };
}

function S3Settings({ showTitle = true }: { showTitle?: boolean }) {
  const t = useTranslations("settings.s3Settings");

  return (
    <div>
      <div className="grid gap-6">
        {showTitle && <h2 className="text-2xl font-bold">{t("title")}</h2>}
        <SettingsInputEntry
          {...getS3Part("endpoint")}
          title={t("endpoint")}
          description={t("endpointDesc")}
          placeholder="https://example.com"
          tooltipStyleDescription
        />
        <div className="grid gap-2 grid-cols-2 items-start">
          <SettingsInputEntry
            {...getS3Part("bucket")}
            title={t("bucket")}
            description={t("bucketDesc")}
            placeholder="my-bucket"
            tooltipStyleDescription
          />
          <SettingsInputEntry
            {...getS3Part("region")}
            title={t("region")}
            description={t("regionDesc")}
            placeholder="us-east-1"
            tooltipStyleDescription
          />
        </div>
        <SettingsInputEntry
          {...getS3Part("accKeyId")}
          title={t("accessKey")}
          description={t("accessKeyDesc")}
          placeholder="XXXXXXXX"
          tooltipStyleDescription
        />
        <SettingsInputEntry
          {...getS3Part("secretAccKey")}
          title={t("secretKey")}
          description={t("secretKeyDesc")}
          placeholder="XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX"
          tooltipStyleDescription
        />
        <SettingsSwitchEntry
          atom={focusAtom(s3SettingsAtom, (optic) =>
            optic.prop("forcePathStyle"),
          )}
          title={t("pathStyle")}
          description={t.rich("pathStyleDesc", {
            more: (chunks) => (
              <a
                href="https://docs.aws.amazon.com/AmazonS3/latest/userguide/VirtualHosting.html"
                target="_blank"
                className="hover:text-primary underline-offset-2 underline"
              >
                {chunks}
              </a>
            ),
          })}
        />
        <SettingsInputEntry
          {...getS3Part("pubUrl")}
          title={t("publicUrl")}
          description={t.rich("publicUrlDesc", {
            mono: (chunks) => <span className="font-mono">{chunks}</span>,
            more: (chunks) => (
              <a
                href="https://docs.iport.yfi.moe/guide/getting-started#public-url"
                target="_blank"
                className="hover:text-primary underline-offset-2 underline"
              >
                {chunks}
              </a>
            ),
          })}
          placeholder="https://example1.com"
        />
        <S3Validation />
      </div>
    </div>
  );
}

type S3ValidationResult = { valid: true } | { valid: false; error: string };

function S3Validation() {
  const s3Settings = useAtomValue(s3SettingsAtom);
  const [error, setError] = useState<S3ValidationResult | undefined>(undefined);
  const t = useTranslations("settings.s3Settings");

  async function validate() {
    if (!s3SettingsSchema.safeParse(s3Settings).success) {
      setError({ valid: false, error: "S3 settings are not valid" });
      return;
    }
    const list = await getAndParseCors(s3Settings, window.location.origin);
    if (list.length === 0) {
      setError({ valid: false, error: "S3 settings are not valid" });
      return;
    }
    if (
      ["GET", "PUT", "HEAD", "POST", "DELETE"].some(
        (method) => !list.includes(method),
      )
    ) {
      setError({ valid: false, error: "Some CORS methods not allowed" });
      return;
    }
    setError({ valid: true });
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-4">
        <div>
          {error && (
            <div
              className={`p-2 rounded-md ${error.valid ? "bg-green-100" : "bg-red-100"}`}
            >
              <p
                className={`text-sm font-medium ${error.valid ? "text-green-600" : "text-red-600"}`}
              >
                {error.valid
                  ? t("validSuccess")
                  : t("validError", { error: error.error })}
              </p>
            </div>
          )}
        </div>
        <Button onClick={validate} className="w-fit" variant="outline">
          {t("validateBtn")}
        </Button>
      </div>
    </div>
  );
}

export function SettingsInputEntry<K>({
  title,
  description,
  atom,
  schema,
  placeholder,
  input,
  tooltipStyleDescription,
}: {
  title: string;
  description?: string | React.ReactNode;
  atom: WritableAtom<K, [SetStateAction<K>], void>;
  schema: z.ZodType<K>;
  placeholder?: string;
  input?: (v: K, set: (v: K) => void, id: string) => JSX.Element;
  tooltipStyleDescription?: boolean;
}) {
  if (!input) {
    input = (v, s, id) => (
      <Input
        id={id}
        value={v as string}
        onChange={(e) => s(e.target.value as K)}
        placeholder={placeholder}
      />
    );
  }
  const [value, error, handleChange] = useValidateInputAtom(atom, schema);
  const id = useId();
  return (
    <FormEntry
      id={id}
      title={title}
      description={description}
      error={error}
      tooltipStyleDescription={tooltipStyleDescription}
    >
      {input(value, handleChange, id)}
    </FormEntry>
  );
}

function SettingsSwitchEntry({
  title,
  description,
  atom,
}: {
  title: string;
  description?: string | React.ReactNode;
  atom: WritableAtom<boolean, [SetStateAction<boolean>], void>;
}) {
  const [value, setValue] = useAtom(atom);
  const id = useId();
  return (
    <div className="flex gap-2 items-center w-full justify-between">
      <div className="flex flex-col gap-1 flex-1">
        <Label htmlFor={id} className="w-fit">
          {title}
        </Label>
        {description && (
          <p className="text-sm text-muted-foreground">{description}</p>
        )}
      </div>
      <Switch
        id={id}
        checked={value}
        onCheckedChange={(checked) => setValue(checked)}
      />
    </div>
  );
}

export { S3Settings };
