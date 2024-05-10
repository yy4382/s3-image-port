import { type S3Settings, type Photo } from "~/types";
import { ListObjectsV2Command } from "@aws-sdk/client-s3";
interface s3Photo {
  Key: string;
  LastModified: Date;
}
export default async function (config: S3Settings): Promise<Photo[]> {
  let client;
  try {
    client = newClient(config);
  } catch (e) {
    throw new Error("Failed construct client: " + e);
  }
  const command = new ListObjectsV2Command({
    Bucket: config.bucket,
  });
  const response = await client.send(command);

  // If the HTTP status code is not 200, throw an error
  const httpStatusCode = response.$metadata.httpStatusCode!;
  if (httpStatusCode >= 300) {
    throw new Error(`List operation get http code: ${httpStatusCode}`);
  }

  return (response.Contents as s3Photo[])
    .map((photo: s3Photo) => {
      return {
        Key: photo.Key,
        LastModified: photo.LastModified.toISOString(),
        category: photo.Key.split("/")[0],
        url: key2Url(photo.Key, config),
      };
    })
    .filter((photo) => !photo.Key.endsWith("/")) as Photo[];
}
