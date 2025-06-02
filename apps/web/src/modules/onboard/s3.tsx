import { FormEntryTextAtom } from "@/components/ui/form-entry-validate";
import { useTranslations } from "next-intl";
import { s3SettingsAtom } from "../settings/settingsStore";
import { s3SettingsSchema } from "../settings/settingsStore";
import { S3Options } from "../settings/settingsStore";
import { focusAtom } from "jotai-optics";
import { S3Validation } from "../settings/s3/s3-validation";

export function S3Onboard() {
  return (
    <div className="flex flex-col gap-2">
      <h2 className="text-lg font-bold">Getting your S3 bucket ready</h2>
      <p className="">
        Here&apos;s the most important and tricky part.
        <br /> You need to fill in the following information to use S3 as your
        image storage.
      </p>
      <div className="max-h-[60vh] overflow-y-auto mt-6">
        <S3SettingsForm />
      </div>
    </div>
  );
}

function getS3Part(opt: keyof Omit<S3Options, "forcePathStyle">) {
  return {
    schema: s3SettingsSchema.shape[opt],
    atom: focusAtom(s3SettingsAtom, (optic) => optic.prop(opt)),
  };
}

function S3SettingsForm() {
  const t = useTranslations("settings.s3Settings");
  return (
    <div className="grid gap-6">
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
      />
      <FormEntryTextAtom
        {...getS3Part("secretAccKey")}
        title={t("secretKey")}
        description={t("secretKeyDesc")}
        placeholder="XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX"
        tooltipStyleDescription
      />
      <S3Validation />
    </div>
  );
}
