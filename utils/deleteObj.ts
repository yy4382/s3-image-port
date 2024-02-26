import newClient from "./newClient";
import { DeleteObjectCommand } from "@aws-sdk/client-s3";
import { type Settings } from "~/types";
export default async function (key: string, config: Settings) {
  const client = newClient(config);
  const command = new DeleteObjectCommand({
    Bucket: config.bucket,
    Key: key,
  });
  return client.send(command);
}