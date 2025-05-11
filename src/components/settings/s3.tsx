"use client";

import { FormEntry } from "@/components/ui/formEntry";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { getAndParseCors } from "@/utils/testS3Settings";
import {
  useAtom,
  useAtomValue,
  type WritableAtom,
  type SetStateAction,
} from "jotai";
import { useId, useState, type JSX } from "react";
import * as z from "zod";
import { Button } from "../ui/button";
import { focusAtom } from "jotai-optics";
import {
  s3SettingsAtom,
  s3SettingsSchema,
  type S3Options,
} from "./settingsStore";

function getS3Part(opt: keyof S3Options) {
  return {
    schema: s3SettingsSchema.shape[opt],
    atom: focusAtom(s3SettingsAtom, (optic) => optic.prop(opt)),
  };
}

function S3Settings() {
  return (
    <div>
      <div className="grid gap-6">
        <h2 className="text-2xl font-bold">S3</h2>
        <SettingsInputEntry
          {...getS3Part("endpoint")}
          title="Endpoint"
          description="S3 endpoint"
          placeholder="https://example.com"
        />
        <SettingsInputEntry
          {...getS3Part("bucket")}
          title="Bucket Name"
          description="S3 bucket name"
          placeholder="my-bucket"
        />
        <SettingsInputEntry
          {...getS3Part("region")}
          title="Region"
          description="S3 region"
          placeholder="us-east-1"
        />
        <SettingsInputEntry
          {...getS3Part("accKeyId")}
          title="Access Key"
          description="S3 access key"
          placeholder="XXXXXXXX"
        />
        <SettingsInputEntry
          {...getS3Part("secretAccKey")}
          title="Secret Key"
          description="S3 secret key"
          placeholder="XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX"
        />
        <SettingsInputEntry
          {...getS3Part("forcePathStyle")}
          title="Use Path Style API"
          description="Force using path style API"
          input={(v, s, id) => (
            <Switch
              id={id}
              checked={v as boolean}
              onCheckedChange={(checked) => s(checked)}
            />
          )}
        />
        <SettingsInputEntry
          {...getS3Part("pubUrl")}
          title="Public URL"
          description="S3 public URL"
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
                {error.valid ? "✓ S3 settings are valid" : `⚠ ${error.error}`}
              </p>
            </div>
          )}
        </div>
        <Button onClick={validate} className="w-fit" variant="outline">
          Validate S3 Settings
        </Button>
      </div>
    </div>
  );
}

function SettingsInputEntry<K>({
  title,
  description,
  atom,
  schema,
  placeholder,
  input,
}: {
  title: string;
  description: string;
  atom: WritableAtom<K, [SetStateAction<K>], void>;
  schema: z.ZodType<K>;
  placeholder?: string;
  input?: (v: K, set: (v: K) => void, id: string) => JSX.Element;
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
  const [value, setValue] = useAtom(atom);
  const [error, setError] = useState<string | undefined>(undefined);
  const handleChange = (value: K) => {
    setValue(value);
    const result = schema.safeParse(value);
    if (result.success) {
      setError(undefined);
    } else {
      setError(z.prettifyError(result.error));
    }
  };
  const id = useId();
  return (
    <FormEntry id={id} title={title} description={description} error={error}>
      {input(value, handleChange, id)}
    </FormEntry>
  );
}

export { S3Settings };
