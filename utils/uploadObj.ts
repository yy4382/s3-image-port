import { type Settings } from "~/types";
import { PutObjectCommand } from "@aws-sdk/client-s3";
export default async function (file: Blob, key: string, config: Settings) {
  const client = newClient(config);
  const command = new PutObjectCommand({
    Bucket: config.bucket,
    Key: key,
    Body: file,
  });
  return client.send(command);
}
