import { DateTime, Interval } from "luxon";

export default function (file: File, type: string) {
  const { appSettings } = useValidSettings();
  const keyTemplate =
    appSettings.value.keyTemplate === undefined ||
    appSettings.value.keyTemplate.trim().length === 0
      ? defaultKeyTemplate
      : appSettings.value.keyTemplate.trim();
  const now = DateTime.now();
  const todayStart = now.startOf("day");
  const interval = Interval.fromDateTimes(todayStart, now);
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
