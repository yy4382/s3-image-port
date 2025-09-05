"use client";

import { useTranslations, useLocale } from "next-intl";
import { focusAtom } from "jotai-optics";
import {
  s3SettingsAtom,
  s3SettingsSchema,
  type S3Options,
} from "../settings-store";
import { FormEntryTextAtom } from "@/components/ui/form-entry-validate";
import { useAtom } from "jotai";
import { useEffect } from "react";

// https://gist.github.com/trvrb/43778077ba54274d1a21112916a89c02
const keyIdToRegion: Record<string, string> = {
  "000": "us-west-000",
  "001": "us-west-001",
  "002": "us-west-002",
  "003": "eu-central-003",
  "004": "us-west-004",
  "005": "us-east-005",
};

function getS3Part(
  opt: keyof Pick<
    S3Options,
    "bucket" | "accKeyId" | "secretAccKey" | "pubUrl"
  >,
) {
  return {
    schema: s3SettingsSchema.shape[opt],
    atom: focusAtom(s3SettingsAtom, (optic) => optic.prop(opt)),
  };
}

export function B2Form() {
  const t = useTranslations("settings.s3Settings");
  const locale = useLocale();
  const [s3Settings, setS3Settings] = useAtom(s3SettingsAtom);
  const { accKeyId } = s3Settings;

  useEffect(() => {
    if (accKeyId && accKeyId.length >= 3) {
      const keyIdPrefix = accKeyId.substring(0, 3);
      const region = keyIdToRegion[keyIdPrefix];
      if (region) {
        setS3Settings((prev) => ({
          ...prev,
          region,
          endpoint: `https://s3.${region}.backblazeb2.com`,
          forcePathStyle: true,
        }));
      }
    }
  }, [accKeyId, setS3Settings]);

  return (
    <>
      <div className="grid gap-2 grid-cols-2 items-start">
        <FormEntryTextAtom
          {...getS3Part("bucket")}
          title={t("bucket")}
          description={t("bucketDesc")}
          placeholder="my-bucket"
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
      <FormEntryTextAtom
        {...getS3Part("pubUrl")}
        title={t("publicUrl")}
        description={t.rich("publicUrlDesc", {
          mono: (chunks) => <span className="font-mono">{chunks}</span>,
          more: (chunks) => (
            <a
              href={
                new URL(
                  locale === "zh"
                    ? "/zh/guide/getting-started#public-url"
                    : "/guide/getting-started#public-url",
                  process.env.NEXT_PUBLIC_DOCS_ORIGIN ??
                    "https://docs.imageport.app",
                ).toString()
              }
              target="_blank"
              className="hover:text-primary underline-offset-2 underline"
            >
              {chunks}
            </a>
          ),
        })}
        placeholder="https://example1.com"
      />
    </>
  );
}
