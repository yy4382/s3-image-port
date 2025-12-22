"use client";

import { useLocale, useTranslations } from "use-intl";
import { s3SettingsAtom } from "@/stores/atoms/settings";
import { optionsSchema } from "@/stores/schemas/settings";
import { S3Validation } from "./s3-validation";
import { ExternalLink } from "lucide-react";
import { useAtomValue, useSetAtom } from "jotai";
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Switch } from "@/components/animate-ui/radix/switch";
import { ClientOnly, Link } from "@tanstack/react-router";
import { Skeleton } from "@/components/ui/skeleton";
import { useAppForm } from "@/components/misc/field/field-context";
import { startTransition } from "react";
import { setGalleryDirtyAtom } from "@/stores/atoms/gallery";

function S3SettingsTsForm() {
  const t = useTranslations("settings.s3Settings");
  const defaultValues = useAtomValue(s3SettingsAtom);
  const setValues = useSetAtom(s3SettingsAtom);
  const setGalleryDirty = useSetAtom(setGalleryDirtyAtom);
  const form = useAppForm({
    defaultValues,
    validators: {
      onChange: optionsSchema.shape.s3,
    },
    listeners: {
      onChange: ({ formApi }) => {
        const newValues = formApi.state.values;
        startTransition(() => {
          setValues((prev) => {
            // if includePath changes, set gallery dirty to trigger a refresh
            if (newValues.includePath !== prev.includePath) {
              setGalleryDirty();
            }
            return newValues;
          });
        });
      },
    },
  });
  return (
    <form>
      <FieldGroup className="gap-4">
        <form.AppField
          name="endpoint"
          children={(field) => (
            <field.TextField
              label={t("endpoint")}
              description={t("endpointDesc")}
            />
          )}
        />
        <div className="grid gap-2 grid-cols-2 items-start">
          <form.AppField
            name="bucket"
            children={(field) => (
              <field.TextField
                label={t("bucket")}
                description={t("bucketDesc")}
              />
            )}
          />
          <form.AppField
            name="region"
            children={(field) => (
              <field.TextField
                label={t("region")}
                description={t("regionDesc")}
              />
            )}
          />
        </div>
        <form.AppField
          name="accKeyId"
          children={(field) => (
            <field.PasswordField
              label={t("accessKey")}
              description={t("accessKeyDesc")}
            />
          )}
        />
        <form.AppField
          name="secretAccKey"
          children={(field) => (
            <field.PasswordField
              label={t("secretKey")}
              description={t("secretKeyDesc")}
            />
          )}
        />
        <form.Field
          name="forcePathStyle"
          children={(field) => {
            const isInvalid =
              field.state.meta.isTouched && !field.state.meta.isValid;
            return (
              <Field data-invalid={isInvalid} orientation="horizontal">
                <FieldContent>
                  <FieldLabel htmlFor="s3-path-style">
                    {t("pathStyle")}
                  </FieldLabel>
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
                  id="s3-path-style"
                  name={t("pathStyle")}
                  checked={field.state.value}
                  onCheckedChange={field.handleChange}
                  aria-invalid={isInvalid}
                />
              </Field>
            );
          }}
        />
        <form.AppField
          name="pubUrl"
          children={(field) => (
            <field.TextField
              label={t("publicUrl")}
              description={t.rich("publicUrlDesc", {
                mono: (chunks) => <span className="font-mono">{chunks}</span>,
                more: (chunks) => (
                  <Link
                    from="/$locale"
                    to="/$locale/docs/$"
                    params={({ locale }) => ({
                      locale,
                      _splat: "getting-started",
                    })}
                    hash="public-url"
                    target="_blank"
                    className="hover:text-primary underline-offset-2 underline"
                  >
                    {chunks}
                  </Link>
                ),
              })}
            />
          )}
        />
        <form.AppField
          name="includePath"
          children={(field) => (
            <field.TextField
              label={t("includePath")}
              description={t("includePathDesc")}
            />
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
          <Link
            from="/$locale"
            to="/$locale/docs/$"
            params={{ locale, _splat: "settings-reference" }}
            hash="s3-settings"
            target="_blank"
            className="text-muted-foreground hover:text-primary transition-colors flex items-center gap-1"
            title="View documentation"
          >
            <span className="underline underline-offset-1">docs</span>
            <ExternalLink className="h-4 w-4" />
          </Link>
        </div>
        <ClientOnly fallback={<Skeleton className="w-full h-[580px]" />}>
          <S3SettingsTsForm />
        </ClientOnly>
        <S3Validation />
      </div>
    </div>
  );
}

export { S3Settings };
