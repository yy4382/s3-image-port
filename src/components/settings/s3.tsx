import { FormEntry } from "@/components/ui/formEntry";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { getAndParseCors } from "@/utils/testS3Settings";
import {
  useAtom,
  atom,
  useAtomValue,
  type WritableAtom,
  type SetStateAction,
} from "jotai";
import { atomWithStorage } from "jotai/utils";
import { useId, useState, type JSX } from "react";
import * as z from "zod";
import { Button } from "../ui/button";

function S3Settings() {
  return (
    <div>
      <div className="grid gap-6">
        <h2 className="text-2xl font-bold">S3</h2>
        <SettingsInputEntry
          title="Endpoint"
          description="S3 endpoint"
          atom={endpointAtom}
          schema={endpointSchema}
        />
        <SettingsInputEntry
          title="Bucket Name"
          description="S3 bucket name"
          atom={bucketNameAtom}
          schema={bucketNameSchema}
        />
        <SettingsInputEntry
          title="Region"
          description="S3 region"
          atom={regionAtom}
          schema={regionSchema}
        />
        <SettingsInputEntry
          title="Access Key"
          description="S3 access key"
          atom={accessKeyAtom}
          schema={accessKeySchema}
        />
        <SettingsInputEntry
          title="Secret Key"
          description="S3 secret key"
          atom={secretKeyAtom}
          schema={secretKeySchema}
        />
        <SettingsInputEntry
          title="Use Path Style API"
          description="Force using path style API"
          atom={forcePathStyleAtom}
          schema={z.boolean()}
          input={(v, s, id) => (
            <Switch
              id={id}
              checked={v}
              onCheckedChange={(checked) => s(checked)}
            />
          )}
        />
        <SettingsInputEntry
          title="Public URL"
          description="S3 public URL"
          schema={publicUrlSchema}
          atom={publicUrlAtom}
        />
        <S3Validation />
      </div>
    </div>
  );
}

// MARK: Endpoint
const endpointSchema = z.url();
const endpointAtom = atomWithStorage("s3ip:s3:endpoint", "");

// MARK: Bucket Name
const bucketNameSchema = z.string().min(1);
const bucketNameAtom = atomWithStorage("s3ip:s3:bucketName", "");

// MARK: Region
const regionSchema = z.string().min(1);
const regionAtom = atomWithStorage("s3ip:s3:region", "");

// MARK: Access Key
const accessKeySchema = z.string().min(1);
const accessKeyAtom = atomWithStorage("s3ip:s3:accessKey", "");

// MARK: Secret Key
const secretKeySchema = z.string().min(1);
const secretKeyAtom = atomWithStorage("s3ip:s3:secretKey", "");

// MARK: usePathStyle
const forcePathStyleAtom = atomWithStorage("s3ip:s3:usePathStyle", false);

// MARK: Public url
const publicUrlSchema = z.url();
const publicUrlAtom = atomWithStorage("s3ip:s3:publicUrl", "");

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

const s3SettingsSchema = z.object({
  endpoint: endpointSchema,
  bucket: bucketNameSchema,
  region: regionSchema,
  accKeyId: accessKeySchema,
  secretAccKey: secretKeySchema,
  forcePathStyle: z.boolean(),
  pubUrl: publicUrlSchema,
});

type S3Options = z.infer<typeof s3SettingsSchema>;

/**
 * This atom is used to store the S3 settings.
 *
 * Does not guarantee the settings are valid. To get the valid settings, use `useS3SettingsValue`.
 */
const s3SettingsAtom = atom<S3Options>((get) => ({
  endpoint: get(endpointAtom),
  bucket: get(bucketNameAtom),
  region: get(regionAtom),
  accKeyId: get(accessKeyAtom),
  secretAccKey: get(secretKeyAtom),
  forcePathStyle: get(forcePathStyleAtom),
  pubUrl: get(publicUrlAtom),
}));

const setS3SettingsAtom = atom(null, (_get, set, settings: S3Options) => {
  set(endpointAtom, settings.endpoint);
  set(bucketNameAtom, settings.bucket);
  set(regionAtom, settings.region);
  set(accessKeyAtom, settings.accKeyId);
  set(secretKeyAtom, settings.secretAccKey);
  set(forcePathStyleAtom, settings.forcePathStyle);
  set(publicUrlAtom, settings.pubUrl);
});

const validS3SettingsAtom = atom((get) => {
  const settings = get(s3SettingsAtom);
  const result = s3SettingsSchema.safeParse(settings);
  if (result.success) {
    return result.data;
  }
  return undefined;
});

function SettingsInputEntry<K>({
  title,
  description,
  atom,
  schema,
  input,
}: {
  title: string;
  description: string;
  atom: WritableAtom<K, [SetStateAction<K>], void>;
  schema: z.ZodType<K>;
  input?: (v: K, set: (v: K) => void, id: string) => JSX.Element;
}) {
  if (!input) {
    input = (v, s, id) => (
      <Input
        id={id}
        value={v as string}
        onChange={(e) => s(e.target.value as K)}
        placeholder="https://example.com"
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

export {
  S3Settings,
  s3SettingsSchema,
  s3SettingsAtom,
  setS3SettingsAtom,
  validS3SettingsAtom,
  type S3Options,
};
