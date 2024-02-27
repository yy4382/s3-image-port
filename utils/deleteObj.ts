import newClient from "./newClient";
import { DeleteObjectCommand } from "@aws-sdk/client-s3";
import { type S3Config } from "~/types";
export default async function (key: string, config: S3Config) {
  const client = newClient(config);
  const command = new DeleteObjectCommand({
    Bucket: config.bucket,
    Key: key,
  });
  return client.send(command);
}
