import type { S3Settings } from "@/components/settings/s3";
import ImageS3Client from "./ImageS3Client";

export async function getAndParseCors(
  settings: S3Settings,
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
      rule.AllowedOrigins?.includes(currentOrigin) &&
      rule.AllowedHeaders?.includes("*")
    ) {
      acc.push(...(rule.AllowedMethods ?? []));
    }
    return acc;
  }, [] as string[]);
  return allowedMethods;
}
