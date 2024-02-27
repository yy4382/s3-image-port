import { type Settings, type Photo } from "~/types";
import { ListObjectsV2Command } from "@aws-sdk/client-s3";
import newClient from "./newClient";
interface s3Photo {
  Key: string;
  LastModified: Date;
  ETag: string;
  Size: number;
  StorageClass: string;
}
export default async function (config: Settings): Promise<Photo[]> {
  const client = newClient(config);
  const command = new ListObjectsV2Command({
    Bucket: config.bucket,
  });
  const response = await client.send(command);
  return (response.Contents as s3Photo[])
    .map((photo: s3Photo) => {
      return {
        Key: photo.Key,
        LastModified: photo.LastModified,
        category: photo.Key.split("/")[0],
        url: `${config.endpoint}/${config.bucket}/${photo.Key}`,
      };
    })
    .filter((photo) => !photo.Key.endsWith("/")) as Photo[];
}
