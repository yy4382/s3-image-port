import { describe, expect, it } from "vitest";
import {
  diagnosticContext,
  diagnosticFailureMessage,
  safeDiagnosticFailure,
  serializeDiagnostics,
  toDiagnosticFailure,
} from "./diagnostics";
import {
  imageStorageAccessResultSchema,
  imageStorageCorsResultSchema,
} from "./schema";

const settings = {
  endpoint:
    "https://user:password@s3.example.com/api?X-Amz-Signature=secret#token",
  bucket: "images",
  region: "auto",
  includePath: "folder/",
  accKeyId: "MY-ACCESS-KEY",
  secretAccKey: "MY-SECRET-KEY",
  pubUrl: "https://public.example.com",
  forcePathStyle: false,
};

describe("safe S3 diagnostics", () => {
  it("whitelists context and response fields, removes URL secrets and raw SDK messages", () => {
    const context = diagnosticContext(
      settings,
      "https://app.example.com:8443",
      "ListObjectsV2",
    );
    const error = toDiagnosticFailure({
      name: "SignatureDoesNotMatch",
      message: "Authorization MY-SECRET-KEY",
      $metadata: { httpStatusCode: 403, requestId: "echoed-secret" },
      $response: { body: "signed-url" },
    });
    const result = JSON.parse(
      serializeDiagnostics([
        {
          context: {
            ...context,
            endpoint: settings.endpoint,
            ...{ accKeyId: settings.accKeyId },
          },
          status: "failed",
          error: {
            ...error,
            ...{ cause: new Error("secret"), message: "MY-ACCESS-KEY" },
          },
        },
      ]),
    );
    expect(result).toEqual([
      {
        operation: "ListObjectsV2",
        origin: "https://app.example.com:8443",
        endpoint: "https://s3.example.com/api",
        bucket: "images",
        prefix: "folder/",
        status: "failed",
        reason: "server",
        code: "SignatureDoesNotMatch",
        httpStatus: 403,
      },
    ]);
  });

  it("removes credentials echoed in otherwise allowed fields", () => {
    const context = diagnosticContext(
      {
        ...settings,
        includePath: "MY-ACCESS-KEY/MY-SECRET-KEY",
        bucket: "MY-ACCESS-KEY",
      },
      "https://app.example.com",
      "ListObjectsV2",
    );
    expect(JSON.stringify(context)).not.toMatch(/MY-ACCESS-KEY|MY-SECRET-KEY/);
    expect(
      safeDiagnosticFailure(
        { reason: "server", code: settings.accKeyId, httpStatus: 403 },
        settings,
      ),
    ).toEqual({ reason: "server", httpStatus: 403 });
  });

  it("omits unsafe codes, status values and missing evidence", () => {
    expect(
      toDiagnosticFailure({
        name: "Authorization: secret",
        $metadata: { httpStatusCode: 403 },
      }),
    ).toEqual({ reason: "server", httpStatus: 403 });
    expect(toDiagnosticFailure(new TypeError("Failed to fetch"))).toEqual({
      reason: "network",
    });
    expect(toDiagnosticFailure({ name: "AccessDenied" })).toEqual({
      reason: "unknown",
    });
    expect(
      toDiagnosticFailure({
        name: "Error",
        $metadata: { httpStatusCode: "403" },
      }),
    ).toEqual({ reason: "unknown" });
    expect(
      toDiagnosticFailure({
        name: "SyntaxError",
        $response: { statusCode: 200 },
      }),
    ).toEqual({ reason: "invalid-response", httpStatus: 200 });
    expect(toDiagnosticFailure({ name: "TimeoutError" })).toEqual({
      reason: "timeout",
    });
  });

  it("chooses a specific service code before generic HTTP 403 advice", () => {
    expect(
      diagnosticFailureMessage({
        reason: "server",
        code: "SignatureDoesNotMatch",
        httpStatus: 403,
      }),
    ).toBe("signature");
    expect(
      diagnosticFailureMessage({
        reason: "server",
        code: "UnknownProviderCode",
        httpStatus: 403,
      }),
    ).toBe("server");
    expect(
      diagnosticFailureMessage({ reason: "server", httpStatus: 403 }),
    ).toBe("accessDenied");
  });

  it("schemas keep serializable evidence without exporting arbitrary adapter data", () => {
    expect(
      imageStorageAccessResultSchema.parse({
        ok: false,
        error: {
          reason: "network",
          cause: new TypeError("secret"),
          message: "secret",
        },
      }),
    ).toEqual({ ok: false, error: { reason: "network" } });
    expect(
      imageStorageCorsResultSchema.parse({
        ok: true,
        value: {
          originMatched: true,
          missingMethods: [],
          rawResponse: "secret",
        },
      }),
    ).toEqual({ ok: true, value: { originMatched: true, missingMethods: [] } });
  });
});
