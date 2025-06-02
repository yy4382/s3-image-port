import {
  S3Client,
  ListObjectsV2Command,
  DeleteObjectCommand,
  PutObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
  GetBucketCorsCommand,
} from "@aws-sdk/client-s3";
import type { S3Options } from "@/modules/settings/settingsStore";
import mime from "mime";
import key2Url from "./key2Url";

export type Photo = {
  Key: string;
  LastModified: string;
  url: string;
};

class ImageS3Client {
  client: S3Client;
  bucket: string;
  config: S3Options;

  constructor(s3Settings: S3Options) {
    this.config = s3Settings;
    this.client = new S3Client({
      region: s3Settings.region,
      forcePathStyle: s3Settings.forcePathStyle,
      credentials: {
        accessKeyId: s3Settings.accKeyId,
        secretAccessKey: s3Settings.secretAccKey,
      },
      endpoint: s3Settings.endpoint,
      // TODO: Remove workaround once https://github.com/aws/aws-sdk-js-v3/issues/6834 is fixed.
      requestChecksumCalculation: "WHEN_REQUIRED",
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

  async get(key: string) {
    const command = new GetObjectCommand({
      Bucket: this.bucket,
      Key: key,
    });
    const response = await this.client.send(command);
    // If the HTTP status code is not 200, throw an error
    const httpStatusCode = response.$metadata.httpStatusCode!;
    if (httpStatusCode >= 300) {
      throw new Error(`Get operation get http code: ${httpStatusCode}`);
    }

    return response;
  }

  async head(key: string) {
    const command = new HeadObjectCommand({
      Bucket: this.bucket,
      Key: key,
    });
    const response = await this.client.send(command);
    // If the HTTP status code is not 200, throw an error
    const httpStatusCode = response.$metadata.httpStatusCode!;
    if (httpStatusCode >= 300) {
      throw new Error(`Head operation get http code: ${httpStatusCode}`);
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
    if (httpStatusCode >= 300) {
      throw new Error(`List operation get http code: ${httpStatusCode}`);
    }

    // if bucket is empty, return empty array
    if (!response.Contents) {
      if (response.KeyCount !== 0) {
        console.warn("Bucket is not empty but no contents returned", response);
      }

      return {
        contents: [],
        IsTruncated: false,
        NextContinuationToken: undefined,
      };
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

  async getCors() {
    const command = new GetBucketCorsCommand({
      Bucket: this.bucket,
    });
    const response = await this.client.send(command);
    // If the HTTP status code is not 200, throw an error
    const httpStatusCode = response.$metadata.httpStatusCode!;
    if (httpStatusCode >= 300) {
      throw new Error(`GetCors operation get http code: ${httpStatusCode}`);
    }
    return response;
  }

  private static calculateMIME(file: File | Blob | string, key: string) {
    const defaultMIME = "application/octet-stream";
    const keyExt = key.split(".").pop();

    switch (true) {
      case file instanceof String:
        return "text/plain";
      case file instanceof File || file instanceof Blob:
        if (file.type) {
          return file.type;
        } else if (keyExt) {
          return mime.getType(keyExt) ?? defaultMIME;
        } else {
          console.error("Unexpected file type", key);
          return defaultMIME;
        }
      default:
        return defaultMIME;
    }
  }
}

export default ImageS3Client;
