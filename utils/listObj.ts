import { type S3Settings, type Photo } from "~/types";
import { ListObjectsV2Command } from "@aws-sdk/client-s3";
interface S3Photo {
  Key: string;
  LastModified: Date;
}

export default async function (
  config: S3Settings,
  onlyOnce?: false
): Promise<Photo[]> {
  const listResponse = await list(config);
  let { IsTruncated, NextContinuationToken } = listResponse;
  const contents = listResponse.contents;
  if (onlyOnce) {
    return contents;
  }
  let limit = 200;
  console.log(IsTruncated, limit, NextContinuationToken);
  while (IsTruncated && limit-- > 0) {
    const response = await list(config, NextContinuationToken);
    contents.push(...response.contents);
    IsTruncated = response.IsTruncated;
    NextContinuationToken = response.NextContinuationToken;
  }
  return contents;
}

async function list(
  config: S3Settings,
  NextContinuationToken?: string
): Promise<{
  contents: Photo[];
  IsTruncated: boolean | undefined;
  NextContinuationToken: string | undefined;
}> {
  let client;
  try {
    client = newClient(config);
  } catch (e) {
    throw new Error("Failed construct client: " + e);
  }
  const command = new ListObjectsV2Command({
    Bucket: config.bucket,
    ContinuationToken: NextContinuationToken,
  });
  const response = await client.send(command);

  // If the HTTP status code is not 200, throw an error
  const httpStatusCode = response.$metadata.httpStatusCode!;
  if (httpStatusCode >= 300) {
    throw new Error(`List operation get http code: ${httpStatusCode}`);
  }
  const contents = (response.Contents as S3Photo[])
    .map((photo: S3Photo) => {
      return {
        Key: photo.Key,
        LastModified: photo.LastModified.toISOString(),
        category: photo.Key.split("/")[0],
        url: key2Url(photo.Key, config),
      };
    })
    .filter((photo) => !photo.Key.endsWith("/")) as Photo[];
  return {
    contents,
    IsTruncated: response.IsTruncated,
    NextContinuationToken: response.NextContinuationToken,
  };
}
