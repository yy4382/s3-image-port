import { type S3Settings } from "~/types";
import { PutObjectCommand } from "@aws-sdk/client-s3";
import mime from "mime-types";
import newClient from "./newClient";
export const defaultKeyTemplate =
  "i/{{year}}/{{month}}/{{day}}/{{random}}.{{ext}}";
export default async function (
  file: Blob | Buffer,
  key: string,
  config: S3Settings,
) {
  let client;
  try {
    client = newClient(config);
  } catch (e) {
    throw new Error("Failed construct client: " + e);
  }
  const fileExt = key.split(".").pop();
  if (!fileExt) {
    throw new Error("File extension not found");
  }
  const command = new PutObjectCommand({
    Bucket: config.bucket,
    Key: key,
    Body: file,
    ContentType: mime.types[fileExt] || "application/octet-stream",
  });
  const response = await client.send(command);
  // If the HTTP status code is not 200, throw an error
  const httpStatusCode = response.$metadata.httpStatusCode!;
  if (httpStatusCode >= 300) {
    throw new Error(`List operation get http code: ${httpStatusCode}`);
  }

  return response;
}
