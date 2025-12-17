import { format } from "date-fns";
import { ulid, type ULIDFactory } from "ulid";
import mime from "mime";
import { S3Options } from "@/modules/settings/settings-store";

const _availablePlaceholders = [
  "year",
  "month",
  "day",
  "timestamp",
  "filename",
  "ulid",
  "ext",

  /**
   * Should always be used with year & month & day
   */
  "ulid-dayslice",
  /**
   * @deprecated renamed to `ulid-dayslice`
   */
  "random",
] as const;

type AvailablePlaceholders = (typeof _availablePlaceholders)[number];

export const defaultKeyTemplate =
  "i/{{year}}/{{month}}/{{day}}/{{ulid-dayslice}}.{{ext}}";

/**
 * Utility class for generating and updating a S3 key.
 *
 * use `create` to generate a new key metadata from a file and template.
 *
 * the `toString` method will return the final S3 key.
 */
export class S3KeyMetadata {
  template: string;
  data: Record<AvailablePlaceholders, string>;
  private constructor(
    template: string,
    data: Record<AvailablePlaceholders, string>,
  ) {
    this.template = template;
    this.data = data;
  }
  static create(file: File, template: string, ulidGenerator?: ULIDFactory) {
    const generatedUlid = ulidGenerator ? ulidGenerator() : ulid();
    const data: Record<AvailablePlaceholders, string> = {
      year: format(new Date(), "yyyy"),
      month: format(new Date(), "MM"),
      day: format(new Date(), "dd"),
      filename: file.name.split(".").shift() || "",
      ext: mime.getExtension(file.type) ?? file.name.split(".").pop() ?? "",
      "ulid-dayslice": `${generatedUlid.slice(4, 10).toLowerCase()}-${generatedUlid.slice(-4).toLowerCase()}`,
      random: `${generatedUlid.slice(4, 10).toLowerCase()}-${generatedUlid.slice(-4).toLowerCase()}`,
      timestamp: new Date().getTime().toString(),
      ulid: generatedUlid,
    };
    return new S3KeyMetadata(template, data);
  }
  static updateFile(file: File, prev: S3KeyMetadata) {
    return new S3KeyMetadata(prev.template, {
      ...prev.data,
      filename: file.name,
      ext: mime.getExtension(file.type) ?? file.name.split(".").pop() ?? "",
    });
  }
  static updateTemplate(template: string, prev: S3KeyMetadata) {
    return new S3KeyMetadata(template, prev.data);
  }
  toString() {
    return this.template.replace(
      /{{(.*?)}}/g,
      (match, key) => this.data[key as AvailablePlaceholders] || match,
    );
  }
}

function addTrailingSlash(url: string) {
  if (url.endsWith("/")) {
    return url;
  }
  return url + "/";
}
export function s3Key2Url(key: string, config: S3Options) {
  if (!config.pubUrl) {
    return addTrailingSlash(config.endpoint) + config.bucket + "/" + key;
  } else {
    return addTrailingSlash(config.pubUrl) + key;
  }
}
