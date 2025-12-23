import { z } from "zod";
import * as v3Schema from "../v3";
import { defaultKeyTemplate } from "@/lib/s3/s3-key";

type Options = z.infer<typeof v3Schema.optionsSchemaForLoad>;
export function migrateFromV1(v1ProfileRaw: unknown): Options | Error {
  let v1ProfileRawObject: object;
  if (typeof v1ProfileRaw === "string") {
    try {
      v1ProfileRawObject = JSON.parse(v1ProfileRaw);
    } catch {
      try {
        v1ProfileRawObject = JSON.parse(decodeURIComponent(v1ProfileRaw));
      } catch (error) {
        return new Error("Failed to parse v1 profile", { cause: error });
      }
    }
  } else if (typeof v1ProfileRaw === "object" && v1ProfileRaw !== null) {
    v1ProfileRawObject = v1ProfileRaw;
  } else {
    return new Error("Invalid v1 profile");
  }
  const v1ProfileParsed = z
    .object({
      s3: z.record(z.string(), z.unknown()),
      app: z.record(z.string(), z.unknown()),
    })
    .safeParse(v1ProfileRawObject);
  if (!v1ProfileParsed.success) {
    return new Error("Failed to parse v1 profile", {
      cause: v1ProfileParsed.error,
    });
  }
  const oldS3Settings = v1ProfileParsed.data.s3;
  const oldAppSettings = v1ProfileParsed.data.app;

  const newOptions: Options = {
    s3: {
      endpoint: String(oldS3Settings?.endpoint ?? ""),
      bucket: String(oldS3Settings?.bucket ?? ""),
      region: String(oldS3Settings?.region ?? ""),
      accKeyId: String(oldS3Settings?.accKeyId ?? ""),
      secretAccKey: String(oldS3Settings?.secretAccKey ?? ""),
      forcePathStyle: Boolean(oldS3Settings?.forcePathStyle ?? false),
      pubUrl: String(oldS3Settings?.pubUrl ?? ""),
      includePath: String(oldS3Settings?.includePath ?? ""),
    },
    upload: {
      keyTemplate: String(oldAppSettings?.keyTemplate || defaultKeyTemplate),
      keyTemplatePresets: [],
      compressionOption: null,
    },
    gallery: {
      autoRefresh: Boolean(oldAppSettings?.enableAutoRefresh ?? true),
    },
  };
  return newOptions;
}
