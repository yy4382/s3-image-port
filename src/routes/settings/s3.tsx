import { FormEntry } from "@/components/ui/formEntry";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { createFileRoute } from "@tanstack/react-router";
import { useAtom, atom, useAtomValue } from "jotai";
import {
  atomWithStorage,
  unstable_withStorageValidator as withStorageValidator,
  createJSONStorage,
} from "jotai/utils";
import { useId, useState } from "react";
import * as z from "zod";

export const Route = createFileRoute("/settings/s3")({
  component: RouteComponent,
});

function RouteComponent() {
  return <S3Settings />;
}

function S3Settings() {
  return (
    <div>
      <div className="grid gap-6">
        <Endpoint />
        <BucketName />
        <Region />
        <AccessKey />
        <SecretKey />
        <UsePathStyle />
        <PublicUrl />
      </div>
    </div>
  );
}

// MARK: Endpoint
const endpointSchema = z.url();
const endpointAtom = atomWithStorage(
  "s3ip:s3:endpoint",
  "",
  withStorageValidator((value): value is string => {
    return endpointSchema.safeParse(value).success;
  })(createJSONStorage()),
  { getOnInit: true },
);

function Endpoint() {
  const [endpoint, setEndpoint] = useAtom(endpointAtom);
  const [error, setError] = useState<string | undefined>(undefined);
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setEndpoint(value);
    const result = endpointSchema.safeParse(value);
    if (result.success) {
      setError(undefined);
    } else {
      setError(z.prettifyError(result.error));
    }
  };
  const id = useId();
  return (
    <FormEntry
      id={id}
      title="Endpoint"
      description="The URL of the S3 endpoint. Bucket name is not included."
      error={error}
    >
      <Input id={id} value={endpoint} onChange={handleChange} />
    </FormEntry>
  );
}

// MARK: Bucket Name
const bucketNameSchema = z.string().min(1);
const bucketNameAtom = atomWithStorage(
  "s3ip:s3:bucketName",
  "",
  withStorageValidator((value): value is string => {
    return bucketNameSchema.safeParse(value).success;
  })(createJSONStorage()),
  { getOnInit: true },
);
function BucketName() {
  const [bucketName, setBucketName] = useAtom(bucketNameAtom);
  const [error, setError] = useState<string | undefined>(undefined);
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setBucketName(value);
    const result = bucketNameSchema.safeParse(value);
    if (result.success) {
      setError(undefined);
    } else {
      setError(z.prettifyError(result.error));
    }
  };
  const id = useId();
  return (
    <FormEntry
      id={id}
      title="Bucket Name"
      description="The name of the S3 bucket."
      error={error}
    >
      <Input id={id} value={bucketName} onChange={handleChange} />
    </FormEntry>
  );
}

// MARK: Region
const regionSchema = z.string().min(1);
const regionAtom = atomWithStorage(
  "s3ip:s3:region",
  "",
  withStorageValidator((value): value is string => {
    return regionSchema.safeParse(value).success;
  })(createJSONStorage()),
  { getOnInit: true },
);

function Region() {
  const [region, setRegion] = useAtom(regionAtom);
  const [error, setError] = useState<string | undefined>(undefined);
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setRegion(value);
    const result = regionSchema.safeParse(value);
    if (result.success) {
      setError(undefined);
    } else {
      setError(z.prettifyError(result.error));
    }
  };
  const id = useId();
  return (
    <FormEntry
      id={id}
      title="Region"
      description="The region of the S3 bucket."
      error={error}
    >
      <Input id={id} value={region} onChange={handleChange} />
    </FormEntry>
  );
}

// MARK: Access Key
const accessKeySchema = z.string().min(1);
const accessKeyAtom = atomWithStorage(
  "s3ip:s3:accessKey",
  "",
  withStorageValidator((value): value is string => {
    return accessKeySchema.safeParse(value).success;
  })(createJSONStorage()),
  { getOnInit: true },
);
function AccessKey() {
  const [accessKey, setAccessKey] = useAtom(accessKeyAtom);
  const [error, setError] = useState<string | undefined>(undefined);
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setAccessKey(value);
    const result = accessKeySchema.safeParse(value);
    if (result.success) {
      setError(undefined);
    } else {
      setError(z.prettifyError(result.error));
    }
  };
  const id = useId();
  return (
    <FormEntry
      id={id}
      title="Access Key"
      description="The access key for the S3 bucket."
      error={error}
    >
      <Input id={id} value={accessKey} onChange={handleChange} />
    </FormEntry>
  );
}

// MARK: Secret Key
const secretKeySchema = z.string().min(1);
const secretKeyAtom = atomWithStorage(
  "s3ip:s3:secretKey",
  "",
  withStorageValidator((value): value is string => {
    return secretKeySchema.safeParse(value).success;
  })(createJSONStorage()),
  { getOnInit: true },
);
function SecretKey() {
  const [secretKey, setSecretKey] = useAtom(secretKeyAtom);
  const [error, setError] = useState<string | undefined>(undefined);
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSecretKey(value);
    const result = secretKeySchema.safeParse(value);
    if (result.success) {
      setError(undefined);
    } else {
      setError(z.prettifyError(result.error));
    }
  };
  const id = useId();
  return (
    <FormEntry
      id={id}
      title="Secret Key"
      description="The secret key for the S3 bucket."
      error={error}
    >
      <Input id={id} value={secretKey} onChange={handleChange} />
    </FormEntry>
  );
}

// MARK: usePathStyle
const usePathStyleAtom = atomWithStorage(
  "s3ip:s3:usePathStyle",
  false,
  withStorageValidator((value): value is boolean => {
    return z.boolean().safeParse(value).success;
  })(createJSONStorage()),
  { getOnInit: true },
);
function UsePathStyle() {
  const [usePathStyle, setUsePathStyle] = useAtom(usePathStyleAtom);
  const id = useId();
  return (
    <div className="grid grid-cols-[1fr_auto] gap-2">
      <div className="grid gap-2">
        <Label htmlFor={id}>Use Path Style API</Label>
        <p className="text-muted-foreground text-sm">
          使用 end.point/bucket/key 而不是 bucket.end.point/key
        </p>
      </div>
      <Switch
        id={id}
        checked={usePathStyle}
        onCheckedChange={setUsePathStyle}
      />
    </div>
  );
}

// MARK: Public url
const publicUrlSchema = z.url();
const publicUrlAtom = atomWithStorage(
  "s3ip:s3:publicUrl",
  "",
  withStorageValidator((value): value is string => {
    return publicUrlSchema.safeParse(value).success;
  })(createJSONStorage()),
  { getOnInit: true },
);
function PublicUrl() {
  const [publicUrl, setPublicUrl] = useAtom(publicUrlAtom);
  const [error, setError] = useState<string | undefined>(undefined);
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setPublicUrl(value);
    const result = publicUrlSchema.safeParse(value);
    if (result.success) {
      setError(undefined);
    } else {
      setError(z.prettifyError(result.error));
    }
  };
  const id = useId();
  return (
    <FormEntry
      id={id}
      title="Public URL"
      description="The public URL of the S3 bucket."
      error={error}
    >
      <Input id={id} value={publicUrl} onChange={handleChange} />
    </FormEntry>
  );
}

export const s3SettingsSchema = z.object({
  endpoint: endpointSchema,
  bucket: bucketNameSchema,
  region: regionSchema,
  accKeyId: accessKeySchema,
  secretAccKey: secretKeySchema,
  forcePathStyle: z.boolean(),
  pubUrl: publicUrlSchema,
});

export type S3Settings = z.infer<typeof s3SettingsSchema>;

/**
 * This atom is used to store the S3 settings.
 *
 * Does not guarantee the settings are valid. To get the valid settings, use `useS3SettingsValue`.
 */
export const s3SettingsAtom = atom<S3Settings>((get) => ({
  endpoint: get(endpointAtom),
  bucket: get(bucketNameAtom),
  region: get(regionAtom),
  accKeyId: get(accessKeyAtom),
  secretAccKey: get(secretKeyAtom),
  forcePathStyle: get(usePathStyleAtom),
  pubUrl: get(publicUrlAtom),
}));

export function useS3SettingsValue(
  failureCallback?: () => void,
): S3Settings | undefined {
  const s3Settings = useAtomValue(s3SettingsAtom);
  const result = s3SettingsSchema.safeParse(s3Settings);
  if (result.success) {
    return result.data;
  } else {
    if (failureCallback) {
      failureCallback();
    }
    return undefined;
  }
}
