import type { S3Options } from "@/components/settings/settingsStore";
import ImageS3Client from "./ImageS3Client";

export async function getAndParseCors(
  settings: S3Options,
  currentOrigin: string,
) {
  let corsResp;
  try {
    corsResp = await new ImageS3Client(settings).getCors();
  } catch {
    return [];
  }
  const cors = corsResp.CORSRules;
  if (!cors) {
    return [];
  }
  const allowedMethods = cors.reduce((acc, rule) => {
    if (
      (rule.AllowedOrigins?.includes(currentOrigin) ||
        rule.AllowedOrigins?.includes("*")) &&
      rule.AllowedHeaders?.includes("*")
    ) {
      acc.push(...(rule.AllowedMethods ?? []));
    }
    return acc;
  }, [] as string[]);
  return allowedMethods;
}
