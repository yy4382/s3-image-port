"use client";

import { useLocale, useTranslations } from "next-intl";
import { focusAtom } from "jotai-optics";
import {
  s3SettingsAtom,
  s3SettingsSchema,
  type S3Options,
} from "../settings-store";
import {
  FormEntrySwitchAtom,
  FormEntryTextAtom,
} from "@/components/ui/form-entry-validate";
import { S3Validation } from "./s3-validation";
import { ExternalLink } from "lucide-react";

function getS3Part(opt: keyof Omit<S3Options, "forcePathStyle">) {
  return {
    schema: s3SettingsSchema.shape[opt],
    atom: focusAtom(s3SettingsAtom, (optic) => optic.prop(opt)),
  };
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
        <FormEntryTextAtom
          {...getS3Part("endpoint")}
          title={t("endpoint")}
          description={t("endpointDesc")}
          placeholder="https://example.com"
          tooltipStyleDescription
        />
        <div className="grid gap-2 grid-cols-2 items-start">
          <FormEntryTextAtom
            {...getS3Part("bucket")}
            title={t("bucket")}
            description={t("bucketDesc")}
            placeholder="my-bucket"
            tooltipStyleDescription
          />
          <FormEntryTextAtom
            {...getS3Part("region")}
            title={t("region")}
            description={t("regionDesc")}
            placeholder="us-east-1"
            tooltipStyleDescription
          />
        </div>
        <FormEntryTextAtom
          {...getS3Part("accKeyId")}
          title={t("accessKey")}
          description={t("accessKeyDesc")}
          placeholder="XXXXXXXX"
          tooltipStyleDescription
          password
        />
        <FormEntryTextAtom
          {...getS3Part("secretAccKey")}
          title={t("secretKey")}
          description={t("secretKeyDesc")}
          placeholder="XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX"
          tooltipStyleDescription
          password
        />
        <FormEntrySwitchAtom
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
        <FormEntryTextAtom
          {...getS3Part("pubUrl")}
          title={t("publicUrl")}
          description={t.rich("publicUrlDesc", {
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
          placeholder="https://example1.com"
        />
        <S3Validation />
      </div>
    </div>
  );
}

export { S3Settings };
