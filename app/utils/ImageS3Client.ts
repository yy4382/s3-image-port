import {
  S3Client,
  ListObjectsV2Command,
  DeleteObjectCommand,
  PutObjectCommand,
} from "@aws-sdk/client-s3";
import { type S3Settings, type Photo } from "~/types";
import mime from "mime";

class ImageS3Client {
  client: S3Client;
  bucket: string;
  config: S3Settings;

  constructor(s3Settings: S3Settings) {
    this.config = s3Settings;
    this.client = new S3Client({
      region: s3Settings.region,
      credentials: {
        accessKeyId: s3Settings.accKeyId,
        secretAccessKey: s3Settings.secretAccKey,
      },
      endpoint: s3Settings.endpoint,
    });
    this.bucket = s3Settings.bucket;
  }

  /**
   *
   * @param file The (processed) file to upload
   * @param key The key to use in S3
   * @returns The response from the S3 upload operation
   */
  async upload(file: File | string, key: string) {
    const mimeType = ImageS3Client.calculateMIME(file, key);

    const command = new PutObjectCommand({
      Bucket: this.bucket,
      Key: key,
      Body: file,
      ContentType: mimeType,
    });
    const response = await this.client.send(command);
    // If the HTTP status code is not 200, throw an error
    const httpStatusCode = response.$metadata.httpStatusCode!;
    if (httpStatusCode >= 300) {
      throw new Error(`List operation get http code: ${httpStatusCode}`);
    }

    return response;
  }

  async list(onlyOnce = false, maxAttempts = 200): Promise<Photo[]> {
    const fetchAllContents = async (
      nextToken?: string,
      acc = [] as Photo[],
      attempts = 0,
    ) => {
      if (attempts >= maxAttempts) {
        // hit max attempts, return the accumulated contents
        return acc;
      }

      const response = await this.listOnce(nextToken);
      const newContents = [...acc, ...response.contents];

      if (!response.IsTruncated || onlyOnce) {
        return newContents;
      }

      return fetchAllContents(
        response.NextContinuationToken,
        newContents,
        attempts + 1,
      );
    };

    return fetchAllContents();
  }

  async listOnce(NextContinuationToken?: string): Promise<{
    contents: Photo[];
    IsTruncated: boolean | undefined;
    NextContinuationToken: string | undefined;
  }> {
    const command = new ListObjectsV2Command({
      Bucket: this.bucket,
      ContinuationToken: NextContinuationToken,
    });
    const response = await this.client.send(command);

    // If the HTTP status code is not 200, throw an error
    const httpStatusCode = response.$metadata.httpStatusCode!;
    if (httpStatusCode >= 300 || !response.Contents) {
      throw new Error(`List operation get http code: ${httpStatusCode}`);
    }
    const contents = response.Contents.map((photo) => {
      return {
        Key: photo.Key,
        LastModified: photo.LastModified?.toISOString(),
        url: key2Url(photo.Key!, this.config),
      } as Photo;
    }).filter((photo) => !photo.Key.endsWith("/"));
    return {
      contents,
      IsTruncated: response.IsTruncated,
      NextContinuationToken: response.NextContinuationToken,
    };
  }

  async delete(key: string) {
    const command = new DeleteObjectCommand({
      Bucket: this.bucket,
      Key: key,
    });
    const response = await this.client.send(command);
    // If the HTTP status code is not 200, throw an error
    const httpStatusCode = response.$metadata.httpStatusCode!;
    if (httpStatusCode >= 300) {
      throw new Error(`Delete operation get http code: ${httpStatusCode}`);
    }

    return response;
  }

  static calculateMIME(file: File | string, key: string) {
    const defaultMIME = "application/octet-stream";
    const keyExt = key.split(".").pop();

    switch (true) {
      case file instanceof String:
        return "text/plain";
      case file instanceof File:
        if (file.type) {
          return file.type;
        } else if (keyExt) {
          return mime.getType(keyExt) ?? defaultMIME;
        } else {
          return defaultMIME;
        }
      default:
        return defaultMIME;
    }
  }
}

export default ImageS3Client;
