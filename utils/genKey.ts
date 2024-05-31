import { DateTime, Interval } from "luxon";

export default function (file: File, type: string, keyTemplate: string) {
  if (keyTemplate === undefined || keyTemplate.trim().length === 0) {
    // If key template is not provided, use default
    keyTemplate = defaultKeyTemplate;
  }

  const now = DateTime.now();
  const interval = Interval.fromDateTimes(now.startOf("day"), now);

  const data: Record<string, string> = {
    year: now.toFormat("yyyy"),
    month: now.toFormat("LL"),
    day: now.toFormat("dd"),
    filename: file.name.split(".").shift() || "",
    ext: type === "none" ? file.name.split(".").pop() || "" : type,
    random: `${interval.length("milliseconds").toString(36)}-${Math.random()
      .toString(36)
      .substring(2, 4)}`,
  };
  return keyTemplate.replace(/{{(.*?)}}/g, (match, key) => data[key] || match);
}
