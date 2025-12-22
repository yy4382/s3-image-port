import {
  S3Client,
  ListObjectsV2Command,
  DeleteObjectCommand,
  PutObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
  GetBucketCorsCommand,
  CopyObjectCommand,
} from "@aws-sdk/client-s3";
import type { S3Options } from "@/stores/schemas/settings";
import mime from "mime";
import { s3Key2Url } from "./s3-key";
import type { Photo } from "@/stores/schemas/photo";

/**
 * A client for the S3 API.
 *
 * The creation overhead of the class is ignorable, so we can create one from
 * settings every time we need it.
 */
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
      ...(this.config.includePath && { Prefix: this.config.includePath }),
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
        url: s3Key2Url(photo.Key!, this.config),
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

  /**
   * Renames an object by copying it to a new key and deleting the old one.
   * This is the most ACID approach possible with S3 (server-side copy, no data transfer).
   *
   * IMPORTANT: Race condition exists - another process could create an object at newKey
   * between the existence check and the copy operation. This is a limitation of S3's API.
   *
   * Notes:
   * - There's a brief window between copy and delete where both objects exist
   * - Checks if newKey already exists to prevent accidental data loss
   * - Use force=true to intentionally overwrite an existing object at newKey
   *
   * @param oldKey The current key of the object
   * @param newKey The new key for the object
   * @param force If true, allows overwriting an existing object at newKey (default: false)
   * @returns The response from the copy operation
   * @throws Error if newKey already exists and force=false
   */
  async rename(oldKey: string, newKey: string, force = false) {
    // Step 1: Check if newKey already exists (to prevent data loss)
    if (!force) {
      try {
        await this.head(newKey);
        // If head succeeds, object exists at newKey
        throw new Error(
          `Object already exists at key "${newKey}". Use force=true to overwrite, or choose a different key.`,
        );
      } catch (error: unknown) {
        // If head fails with 404/NotFound, the key doesn't exist (safe to proceed)
        // If it's our custom error about existing object, re-throw it
        if (
          error instanceof Error &&
          error.message?.includes("Object already exists")
        ) {
          throw error;
        }
        // Other errors (404, NotFound) mean object doesn't exist - continue
        const awsError = error as {
          $metadata?: { httpStatusCode?: number };
          name?: string;
        };
        if (
          awsError.$metadata?.httpStatusCode !== 404 &&
          awsError.name !== "NotFound"
        ) {
          // Unexpected error during head operation
          const errorMessage =
            error instanceof Error ? error.message : String(error);
          throw new Error(
            `Failed to check if ${newKey} exists: ${errorMessage}`,
          );
        }
      }
    }

    // Step 2: Copy the object to the new key (server-side, preserves metadata)
    const copyCommand = new CopyObjectCommand({
      Bucket: this.bucket,
      CopySource: `${this.bucket}/${oldKey}`,
      Key: newKey,
    });
    const copyResponse = await this.client.send(copyCommand);

    // Check if copy was successful
    const copyStatusCode = copyResponse.$metadata.httpStatusCode!;
    if (copyStatusCode >= 300) {
      throw new Error(`Rename copy operation get http code: ${copyStatusCode}`);
    }

    // Step 3: Delete the old object
    try {
      await this.delete(oldKey);
    } catch (error) {
      // Copy succeeded but delete failed - log warning but don't throw
      // This leaves both objects in the bucket, which is safer than losing data
      console.error(
        `Rename: Copy succeeded but delete of old key failed for ${oldKey}`,
        error,
      );
      throw new Error(
        `Renamed to ${newKey} but failed to delete old key ${oldKey}. Both objects exist.`,
      );
    }

    return copyResponse;
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
