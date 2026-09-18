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

export type ListedS3ImageObject = {
  Key: string;
  LastModified?: string;
};

class ImageS3Client {
  private readonly client: S3Client;
  private readonly bucket: string;
  private readonly settings: S3Options;

  constructor(settings: S3Options) {
    this.settings = settings;
    this.client = this.createClient();
    this.bucket = settings.bucket;
  }

  private createClient(maxAttempts?: number) {
    const settings = this.settings;
    return new S3Client({
      ...(maxAttempts !== undefined && { maxAttempts }),
      region: settings.region,
      forcePathStyle: settings.forcePathStyle,
      credentials: {
        accessKeyId: settings.accKeyId,
        secretAccessKey: settings.secretAccKey,
      },
      endpoint: settings.endpoint,
      // TODO: Remove workaround once https://github.com/aws/aws-sdk-js-v3/issues/6834 is fixed.
      requestChecksumCalculation: "WHEN_REQUIRED",
    });
  }

  async upload(file: File | Blob | string, key: string) {
    const response = await this.client.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: file,
        ContentType: contentTypeForBody(file, key),
      }),
    );
    assertSuccessfulResponse("Upload", response.$metadata.httpStatusCode);
    return response;
  }

  async get(key: string) {
    const response = await this.client.send(
      new GetObjectCommand({
        Bucket: this.bucket,
        Key: key,
      }),
    );
    assertSuccessfulResponse("Get", response.$metadata.httpStatusCode);
    return response;
  }

  async head(key: string) {
    const response = await this.client.send(
      new HeadObjectCommand({
        Bucket: this.bucket,
        Key: key,
      }),
    );
    assertSuccessfulResponse("Head", response.$metadata.httpStatusCode);
    return response;
  }

  async list(maxPages = 200): Promise<ListedS3ImageObject[]> {
    const contents: ListedS3ImageObject[] = [];
    let nextToken: string | undefined;

    for (let pageCount = 0; pageCount < maxPages; pageCount++) {
      const page = await this.listPage(nextToken);
      contents.push(...page.contents);

      if (!page.isTruncated) {
        return contents;
      }

      nextToken = page.nextContinuationToken;
    }

    return contents;
  }

  async delete(key: string) {
    const response = await this.client.send(
      new DeleteObjectCommand({
        Bucket: this.bucket,
        Key: key,
      }),
    );
    assertSuccessfulResponse("Delete", response.$metadata.httpStatusCode);
    return response;
  }

  async rename(oldKey: string, newKey: string, overwrite = false) {
    if (!overwrite) {
      await this.assertMissing(newKey);
    }

    const copyResponse = await this.client.send(
      new CopyObjectCommand({
        Bucket: this.bucket,
        CopySource: `${this.bucket}/${oldKey}`,
        Key: newKey,
      }),
    );
    assertSuccessfulResponse(
      "Rename copy",
      copyResponse.$metadata.httpStatusCode,
    );

    try {
      await this.delete(oldKey);
    } catch (error) {
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

  async checkList(signal?: AbortSignal) {
    return this.diagnostic("ListBucketResult", signal, (client, abortSignal) =>
      client.send(
        new ListObjectsV2Command({
          Bucket: this.bucket,
          MaxKeys: 1,
          ...(this.settings.includePath && {
            Prefix: this.settings.includePath,
          }),
        }),
        { abortSignal },
      ),
    );
  }

  async getCors(signal?: AbortSignal) {
    return this.diagnostic("CORSConfiguration", signal, (client, abortSignal) =>
      client.send(new GetBucketCorsCommand({ Bucket: this.bucket }), {
        abortSignal,
      }),
    );
  }

  private async diagnostic<T>(
    root: string,
    signal: AbortSignal | undefined,
    send: (client: S3Client, signal: AbortSignal) => Promise<T>,
  ) {
    const client = this.createClient(1);
    const controller = new AbortController();
    const abort = () => controller.abort();
    signal?.addEventListener("abort", abort, { once: true });
    if (signal?.aborted) abort();
    let timedOut = false;
    const timer = setTimeout(() => {
      timedOut = true;
      controller.abort();
    }, 10_000);
    // The SDK XML parser is permissive (e.g. HTML with HTTP 200). Validate the
    // actual document before deserialization, without retaining its contents.
    client.middlewareStack.add(
      (next) => async (args) => {
        const result = await next(args);
        const response = result.response as {
          statusCode: number;
          body: BodyInit;
        };
        const body = await new Response(response.body).text();
        response.body = new TextEncoder().encode(body);
        // A status-only error still provides useful HTTP evidence.
        if (response.statusCode >= 300 && !body.trim()) return result;
        const document = new DOMParser().parseFromString(
          body,
          "application/xml",
        );
        if (
          document.querySelector("parsererror") ||
          document.documentElement.localName !==
            (response.statusCode < 300 ? root : "Error")
        ) {
          throw Object.assign(new Error("Invalid S3 response"), {
            name: "InvalidS3Response",
            $metadata: { httpStatusCode: response.statusCode },
          });
        }
        return result;
      },
      { step: "deserialize", priority: "low", name: "validateDiagnosticXml" },
    );
    try {
      return await send(client, controller.signal);
    } catch (error) {
      if (timedOut)
        throw Object.assign(new Error("Request timed out"), {
          name: "TimeoutError",
        });
      throw error;
    } finally {
      clearTimeout(timer);
      signal?.removeEventListener("abort", abort);
      client.destroy();
    }
  }

  private async listPage(nextContinuationToken?: string): Promise<{
    contents: ListedS3ImageObject[];
    isTruncated: boolean | undefined;
    nextContinuationToken: string | undefined;
  }> {
    const response = await this.client.send(
      new ListObjectsV2Command({
        Bucket: this.bucket,
        ContinuationToken: nextContinuationToken,
        ...(this.settings.includePath && { Prefix: this.settings.includePath }),
      }),
    );
    assertSuccessfulResponse("List", response.$metadata.httpStatusCode);

    if (!response.Contents) {
      if (response.KeyCount !== 0) {
        console.warn("Bucket is not empty but no contents returned", response);
      }

      return {
        contents: [],
        isTruncated: false,
        nextContinuationToken: undefined,
      };
    }

    const contents = response.Contents.flatMap((object) => {
      if (!object.Key || object.Key.endsWith("/")) {
        return [];
      }

      return {
        Key: object.Key,
        LastModified: object.LastModified?.toISOString(),
      };
    });

    return {
      contents,
      isTruncated: response.IsTruncated,
      nextContinuationToken: response.NextContinuationToken,
    };
  }

  private async assertMissing(key: string) {
    try {
      await this.head(key);
    } catch (error: unknown) {
      if (isMissingObjectError(error)) {
        return;
      }
      throw new Error(
        `Failed to check if ${key} exists: ${errorMessage(error)}`,
      );
    }

    throw new Error(
      `Object already exists at key "${key}". Use force=true to overwrite, or choose a different key.`,
    );
  }
}

function assertSuccessfulResponse(
  operation: string,
  httpStatusCode: number | undefined,
) {
  if (httpStatusCode !== undefined && httpStatusCode >= 300) {
    throw new Error(`${operation} operation returned HTTP ${httpStatusCode}`);
  }
}

function contentTypeForBody(file: File | Blob | string, key: string) {
  if (typeof file === "string") {
    return "text/plain";
  }

  if (file.type) {
    return file.type;
  }

  const keyExt = key.split(".").pop();
  return keyExt
    ? (mime.getType(keyExt) ?? "application/octet-stream")
    : "application/octet-stream";
}

function isMissingObjectError(error: unknown) {
  const awsError = toAwsError(error);
  return (
    awsError.$metadata?.httpStatusCode === 404 ||
    awsError.name === "NotFound" ||
    awsError.name === "NoSuchKey"
  );
}

function toAwsError(error: unknown): {
  $metadata?: { httpStatusCode?: number };
  name?: string;
} {
  if (typeof error === "object" && error !== null) {
    return error as {
      $metadata?: { httpStatusCode?: number };
      name?: string;
    };
  }
  return {};
}

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : String(error);
}

export default ImageS3Client;
