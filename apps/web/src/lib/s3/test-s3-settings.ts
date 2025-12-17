import type { S3Options } from "@/modules/settings/settings-store";
import ImageS3Client from "./image-s3-client";

const ALL_METHODS = ["GET", "HEAD", "PUT", "POST", "DELETE"] as const;

/**
 * Get the allowed methods for the current origin
 *
 * @param settings - S3 settings
 * @param currentOrigin - Current origin
 * @returns null if the request failed, otherwise the allowed methods
 */
export async function getAllowedMethods(
  settings: S3Options,
  currentOrigin: string,
) {
  let corsResp;
  try {
    corsResp = await new ImageS3Client(settings).getCors();
  } catch {
    return null;
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
  return Array.from(new Set(allowedMethods));
}

export async function testS3Settings(
  settings: S3Options,
  currentOrigin: string,
) {
  const allowedMethods = await getAllowedMethods(settings, currentOrigin);
  if (allowedMethods === null) {
    return {
      valid: false,
      type: "no-result",
    };
  }
  if (ALL_METHODS.some((m) => !allowedMethods.includes(m))) {
    return {
      valid: false,
      type: "no-allowed-methods",
      allowedMethods,
    };
  }
  return {
    valid: true,
  };
}
