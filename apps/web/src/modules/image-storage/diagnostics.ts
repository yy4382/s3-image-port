import { z } from "zod";
import type { S3Options } from "@/stores/schemas/settings";

// Diagnostics are a separate boundary: never pass SDK errors or messages to UI.
export const storageDiagnosticFailureSchema = z.object({
  reason: z.enum([
    "server",
    "network",
    "invalid-response",
    "timeout",
    "unknown",
  ]),
  code: z
    .string()
    .regex(/^[A-Za-z][A-Za-z0-9_.-]{0,79}$/)
    .optional(),
  httpStatus: z.number().int().min(100).max(599).optional(),
});
export type StorageDiagnosticFailure = z.infer<
  typeof storageDiagnosticFailureSchema
>;

export const storageDiagnosticContextSchema = z.object({
  operation: z.enum(["ListObjectsV2", "GetBucketCors"]),
  origin: z.string(),
  endpoint: z.string().transform(sanitizeEndpoint),
  bucket: z.string(),
  prefix: z.string().optional(),
});
export type StorageDiagnosticContext = z.infer<
  typeof storageDiagnosticContextSchema
>;

export function diagnosticContext(
  settings: S3Options,
  origin: string,
  operation: StorageDiagnosticContext["operation"],
) {
  return storageDiagnosticContextSchema.parse({
    operation,
    origin: redact(origin, settings),
    endpoint: redact(sanitizeEndpoint(settings.endpoint), settings),
    bucket: redact(settings.bucket, settings),
    ...(operation === "ListObjectsV2" && {
      prefix: redact(settings.includePath, settings),
    }),
  });
}

function sanitizeEndpoint(endpoint: string) {
  try {
    const url = new URL(endpoint);
    url.username = "";
    url.password = "";
    url.search = "";
    url.hash = "";
    return url.toString();
  } catch {
    return "";
  }
}

function redact(value: string, settings: S3Options) {
  for (const secret of [settings.accKeyId, settings.secretAccKey]) {
    if (secret) {
      value = value
        .split(secret)
        .join("[redacted]")
        .split(encodeURIComponent(secret))
        .join("[redacted]");
    }
  }
  return value;
}

export function safeDiagnosticFailure(
  error: StorageDiagnosticFailure,
  settings: S3Options,
) {
  const parsed = storageDiagnosticFailureSchema.safeParse(error);
  if (!parsed.success) return { reason: "unknown" as const };
  const { code, ...rest } = parsed.data;
  return code && redact(code, settings) === code ? { ...rest, code } : rest;
}

export function toDiagnosticFailure(error: unknown): StorageDiagnosticFailure {
  const raw = (typeof error === "object" && error !== null ? error : {}) as {
    name?: unknown;
    Code?: unknown;
    code?: unknown;
    $metadata?: { httpStatusCode?: unknown };
    $response?: { statusCode?: unknown };
  };
  const status = raw.$metadata?.httpStatusCode ?? raw.$response?.statusCode;
  const httpStatus =
    typeof status === "number" &&
    Number.isInteger(status) &&
    status >= 100 &&
    status <= 599
      ? status
      : undefined;
  const candidate = raw.Code ?? raw.code ?? raw.name;
  const code =
    typeof candidate === "string" &&
    /^[A-Za-z][A-Za-z0-9_.-]{0,79}$/.test(candidate) &&
    ![
      "Error",
      "TypeError",
      "SyntaxError",
      "TimeoutError",
      "AbortError",
      "InvalidS3Response",
    ].includes(candidate)
      ? candidate
      : undefined;
  if (raw.name === "TimeoutError") return { reason: "timeout" };
  if (
    raw.name === "InvalidS3Response" ||
    raw.name === "SyntaxError" ||
    (httpStatus !== undefined && httpStatus < 300)
  ) {
    return {
      reason: "invalid-response",
      ...(httpStatus !== undefined && { httpStatus }),
    };
  }
  // A concrete service code wins over a generic HTTP 403. Local Error.name isn't evidence of a service response.
  if (httpStatus !== undefined)
    return { reason: "server", ...(code && { code }), httpStatus };
  if (raw.name === "TypeError" || raw.name === "NetworkError")
    return { reason: "network" };
  return { reason: "unknown" };
}

export function diagnosticFailureMessage(error: StorageDiagnosticFailure) {
  if (error.reason !== "server") return error.reason;
  switch (error.code) {
    case "AccessDenied":
      return "accessDenied";
    case "InvalidAccessKeyId":
      return "invalidKey";
    case "NoSuchBucket":
      return "noBucket";
    case "SignatureDoesNotMatch":
      return "signature";
    case "NoSuchCORSConfiguration":
      return "noCors";
    case "NotImplemented":
    case "UnsupportedOperation":
      return "unsupported";
    default:
      return error.code
        ? "server"
        : error.httpStatus === 403
          ? "accessDenied"
          : "server";
  }
}

// Explicit whitelist for the clipboard, even if callers accidentally attach extra fields.
export function serializeDiagnostics(
  entries: Array<{
    context: StorageDiagnosticContext;
    status: string;
    error?: StorageDiagnosticFailure;
    httpStatus?: number;
  }>,
) {
  return JSON.stringify(
    entries.map(({ context, status, error, httpStatus }) => ({
      ...storageDiagnosticContextSchema.parse(context),
      status: z.enum(["success", "failed"]).parse(status),
      ...(error
        ? storageDiagnosticFailureSchema.parse(error)
        : typeof httpStatus === "number"
          ? { httpStatus }
          : {}),
    })),
    null,
    2,
  );
}
