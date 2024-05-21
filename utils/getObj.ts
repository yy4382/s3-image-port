import newClient from "~/utils/newClient";
import type { S3Settings } from "~/types";
import { GetObjectCommand } from "@aws-sdk/client-s3";

export default async function (s3Settings: S3Settings, key: string) {
  let client;
  try {
    client = newClient(s3Settings);
  } catch (e) {
    throw new Error("Failed construct client: " + e);
  }

  const command = new GetObjectCommand({
    Bucket: s3Settings.bucket,
    Key: key,
  });
  const response = await client.send(command);

  // If the HTTP status code is not 200, throw an error
  const httpStatusCode = response.$metadata.httpStatusCode!;
  if (httpStatusCode >= 300) {
    throw new Error(`List operation get http code: ${httpStatusCode}`);
  }

  return response;
}