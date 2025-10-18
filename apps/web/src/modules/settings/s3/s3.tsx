"use client";

import { useLocale, useTranslations } from "next-intl";
import {
  s3SettingsAtom,
  s3SettingsSchema,
  type S3Options,
} from "../settings-store";
import { S3Validation } from "./s3-validation";
import { ExternalLink } from "lucide-react";
import { Controller, SubmitHandler, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useAtomValue, useSetAtom } from "jotai";
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";
import { Switch } from "@/components/animate-ui/radix/switch";
import { ClientOnly } from "@/components/misc/client-only";
import { Skeleton } from "@/components/ui/skeleton";

function S3SettingsHookFrom() {
  const t = useTranslations("settings.s3Settings");
  const locale = useLocale();
  const defaultValues = useAtomValue(s3SettingsAtom);
  const setValues = useSetAtom(s3SettingsAtom);
  const form = useForm<S3Options>({
    resolver: zodResolver(s3SettingsSchema),
    values: defaultValues,
    mode: "onTouched",
  });

  const onChange: SubmitHandler<S3Options> = (data) => {
    setValues(data);
  };

  return (
    <form onChange={form.handleSubmit(onChange)}>
      <FieldGroup className="gap-4">
        <Controller
          name="endpoint"
          control={form.control}
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid} className="gap-1">
              <FieldLabel>{t("endpoint")}</FieldLabel>
              <Input {...field} />
              <FieldDescription>{t("endpointDesc")}</FieldDescription>
              {fieldState.error && <FieldError errors={[fieldState.error]} />}
            </Field>
          )}
        />
        <div className="grid gap-2 grid-cols-2 items-start">
          <Controller
            name="bucket"
            control={form.control}
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid} className="gap-1">
                <FieldLabel>{t("bucket")}</FieldLabel>
                <Input {...field} placeholder="my-bucket" />
                <FieldDescription>{t("bucketDesc")}</FieldDescription>
                {fieldState.error && <FieldError errors={[fieldState.error]} />}
              </Field>
            )}
          />
          <Controller
            name="region"
            control={form.control}
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid} className="gap-1">
                <FieldLabel>{t("region")}</FieldLabel>
                <Input {...field} placeholder="us-east-1" />
                <FieldDescription>{t("regionDesc")}</FieldDescription>
                {fieldState.error && <FieldError errors={[fieldState.error]} />}
              </Field>
            )}
          />
        </div>
        <Controller
          name="accKeyId"
          control={form.control}
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid} className="gap-1">
              <FieldLabel>{t("accessKey")}</FieldLabel>
              <PasswordInput {...field} />
              <FieldDescription>{t("accessKeyDesc")}</FieldDescription>
              {fieldState.error && <FieldError errors={[fieldState.error]} />}
            </Field>
          )}
        />
        <Controller
          name="secretAccKey"
          control={form.control}
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid} className="gap-1">
              <FieldLabel>{t("secretKey")}</FieldLabel>
              <PasswordInput {...field} />
              <FieldDescription>{t("secretKeyDesc")}</FieldDescription>
              {fieldState.error && <FieldError errors={[fieldState.error]} />}
            </Field>
          )}
        />
        <Controller
          name="forcePathStyle"
          control={form.control}
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid} orientation="horizontal">
              <FieldContent>
                <FieldLabel>{t("pathStyle")}</FieldLabel>
                <FieldDescription>
                  {t.rich("pathStyleDesc", {
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
                </FieldDescription>
              </FieldContent>
              <Switch
                name={t("pathStyle")}
                checked={field.value}
                onCheckedChange={field.onChange}
                aria-invalid={fieldState.invalid}
              />
            </Field>
          )}
        />
        <Controller
          name="pubUrl"
          control={form.control}
          render={({ field, fieldState }) => (
            <Field className="gap-1" data-invalid={fieldState.invalid}>
              <FieldLabel>{t("publicUrl")}</FieldLabel>
              <Input {...field} placeholder="https://example1.com" />
              <FieldDescription>
                {t.rich("publicUrlDesc", {
                  mono: (chunks) => <span className="font-mono">{chunks}</span>,
                  more: (chunks) => (
                    <a
                      href={new URL(
                        locale === "zh"
                          ? "/zh/guide/getting-started#public-url"
                          : "/guide/getting-started#public-url",
                        process.env.NEXT_PUBLIC_DOCS_ORIGIN ??
                          "https://docs.imageport.app",
                      ).toString()}
                      target="_blank"
                      className="hover:text-primary underline-offset-2 underline"
                    >
                      {chunks}
                    </a>
                  ),
                })}
              </FieldDescription>
              {fieldState.error && <FieldError errors={[fieldState.error]} />}
            </Field>
          )}
        />
      </FieldGroup>
    </form>
  );
}

function S3Settings() {
  const t = useTranslations("settings.s3Settings");
  const locale = useLocale();
  return (
    <div>
      <div className="grid gap-6">
        <div className="flex items-center gap-2 justify-between">
          <h2 className="text-2xl font-bold">{t("title")}</h2>
          <a
            href={new URL(
              locale === "zh"
                ? "/zh/guide/settings-reference#s3-settings"
                : "/guide/settings-reference#s3-settings",
              process.env.NEXT_PUBLIC_DOCS_ORIGIN ??
                "https://docs.imageport.app",
            ).toString()}
            target="_blank"
            className="text-muted-foreground hover:text-primary transition-colors flex items-center gap-1"
            title="View documentation"
          >
            <span className="underline underline-offset-1">docs</span>
            <ExternalLink className="h-4 w-4" />
          </a>
        </div>
        <ClientOnly fallback={<Skeleton className="w-full h-[580px]" />}>
          <S3SettingsHookFrom />
        </ClientOnly>
        <S3Validation />
      </div>
    </div>
  );
}

export { S3Settings };
