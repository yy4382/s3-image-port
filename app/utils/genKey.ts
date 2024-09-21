import { format, differenceInMilliseconds, startOfDay } from "date-fns";

export const defaultKeyTemplate =
  "i/{{year}}/{{month}}/{{day}}/{{random}}.{{ext}}";

export default function (
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
