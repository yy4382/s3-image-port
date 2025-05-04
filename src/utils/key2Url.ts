import type { S3Options } from "@/components/settings/s3";
function addTrailingSlash(url: string) {
  if (url.endsWith("/")) {
    return url;
  }
  return url + "/";
}
export default function (key: string, config: S3Options) {
  if (!config.pubUrl) {
    return addTrailingSlash(config.endpoint) + config.bucket + "/" + key;
  } else {
    return addTrailingSlash(config.pubUrl) + key;
  }
}
