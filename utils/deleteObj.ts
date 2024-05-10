import newClient from "./newClient";
import { DeleteObjectCommand } from "@aws-sdk/client-s3";
import { type S3Settings } from "~/types";
export default async function (key: string, config: S3Settings) {
  let client;
  try {
    client = newClient(config);
  } catch (e) {
    throw new Error("Failed construct client: " + e);
  }
  const command = new DeleteObjectCommand({
    Bucket: config.bucket,
    Key: key,
  });
  const response = await client.send(command);
  // If the HTTP status code is not 200, throw an error
  const httpStatusCode = response.$metadata.httpStatusCode!;
  if (httpStatusCode >= 300) {
    throw new Error(`Delete operation get http code: ${httpStatusCode}`);
  }

  return response;
}
