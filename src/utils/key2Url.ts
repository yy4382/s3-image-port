import type { S3Settings } from "@/components/settings/s3";
function addTrailingSlash(url: string) {
  if (url.endsWith("/")) {
    return url;
  }
  return url + "/";
}
export default function (key: string, config: S3Settings) {
  if (!config.pubUrl) {
    return addTrailingSlash(config.endpoint) + config.bucket + "/" + key;
  } else {
    return addTrailingSlash(config.pubUrl) + key;
  }
}
