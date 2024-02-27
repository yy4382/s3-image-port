import { type S3Config } from "~/types";
import { PutObjectCommand } from "@aws-sdk/client-s3";
import newClient from "./newClient";
export default async function (file: Blob | Buffer, key: string, config: S3Config) {
  const client = newClient(config);
  const command = new PutObjectCommand({
    Bucket: config.bucket,
    Key: key,
    Body: file,
  });
  return client.send(command);
}
