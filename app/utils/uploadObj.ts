import { type S3Settings } from "~/types";
import { PutObjectCommand } from "@aws-sdk/client-s3";
import mime from "mime";
import newClient from "./newClient";
export const defaultKeyTemplate =
  "i/{{year}}/{{month}}/{{day}}/{{random}}.{{ext}}";
export default async function (
  file: File | string,
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

  let mimeType = "application/octet-stream";
  if (file instanceof String) {
    mimeType = "text/plain";
  } else if (file instanceof File) {
    if (file.type) {
      mimeType = file.type;
    } else if (fileExt) {
      mimeType = mime.getType(fileExt) ?? "application/octet-stream";
    } else {
      mimeType = "application/octet-stream";
    }
  }

  const command = new PutObjectCommand({
    Bucket: config.bucket,
    Key: key,
    Body: file,
    ContentType: mimeType,
  });
  const response = await client.send(command);
  // If the HTTP status code is not 200, throw an error
  const httpStatusCode = response.$metadata.httpStatusCode!;
  if (httpStatusCode >= 300) {
    throw new Error(`List operation get http code: ${httpStatusCode}`);
  }

  return response;
}
