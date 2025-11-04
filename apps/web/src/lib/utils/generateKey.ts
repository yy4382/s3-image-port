import { format, differenceInMilliseconds, startOfDay } from "date-fns";
import { ulid, type ULIDFactory } from "ulid";
import mime from "mime";

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

export const defaultKeyTemplate =
  "i/{{year}}/{{month}}/{{day}}/{{ulid-dayslice}}.{{ext}}";

export class S3Key {
  template: string;
  data: Record<(typeof _availablePlaceholders)[number], string>;
  private ulid: string;
  constructor(
    template: string,
    data: Record<(typeof _availablePlaceholders)[number], string>,
  ) {
    this.template = template;
    this.data = data;
    this.ulid = data.ulid;
  }
  static create(file: File, template: string, ulidGenerator?: ULIDFactory) {
    const generatedUlid = ulidGenerator ? ulidGenerator() : ulid();
    const data: Record<(typeof _availablePlaceholders)[number], string> = {
      year: format(new Date(), "yyyy"),
      month: format(new Date(), "MM"),
      day: format(new Date(), "dd"),
      filename: file.name.split(".").shift() || "",
      ext: mime.getExtension(file.type) ?? file.name.split(".").pop() ?? "",
      "ulid-dayslice": `${generatedUlid.slice(4, 10).toLowerCase()}-${generatedUlid.slice(-4).toLowerCase()}`,
      random: `${generatedUlid.slice(4, 10).toLowerCase()}-${generatedUlid.slice(-4).toLowerCase()}`,
      timestamp: new Date().getTime().toString(),
      ulid: ulidGenerator ? ulidGenerator() : ulid(),
    };
    return new S3Key(template, data);
  }
  static updateFile(file: File, prev: S3Key) {
    return new S3Key(prev.template, {
      ...prev.data,
      filename: file.name,
      ext: mime.getExtension(file.type) ?? file.name.split(".").pop() ?? "",
    });
  }
  static updateTemplate(template: string, prev: S3Key) {
    return new S3Key(template, prev.data);
  }
  toString() {
    return this.template.replace(
      /{{(.*?)}}/g,
      (match, key) =>
        this.data[key as (typeof _availablePlaceholders)[number]] || match,
    );
  }
}

export default function generateKey(
  file: File,
  options: { type: string; keyTemplate: string },
) {
  const type = options.type;
  let keyTemplate = options.keyTemplate;

  if (keyTemplate === undefined || keyTemplate.trim().length === 0) {
    // If key template is not provided, use default
    keyTemplate = defaultKeyTemplate;
  }

  const now = new Date();
  const msFromStartOfDay = differenceInMilliseconds(now, startOfDay(now));

  const data: Record<string, string> = {
    year: format(now, "yyyy"),
    month: format(now, "MM"),
    day: format(now, "dd"),
    filename: file.name.split(".").shift() || "",
    ext: type === "none" ? file.name.split(".").pop() || "" : type,
    random: `${msFromStartOfDay.toString(36)}-${Math.random()
      .toString(36)
      .substring(2, 4)}`,
  };
  return keyTemplate.replace(/{{(.*?)}}/g, (match, key) => data[key] || match);
}
