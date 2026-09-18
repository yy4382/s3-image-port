import { z } from "zod";

// Only recognized service codes are safe to show. Never forward SDK messages,
// request URLs, headers, causes, or arbitrary error names to the interface.
const serviceCodeSchema = z.enum([
  "AccessDenied",
  "InvalidAccessKeyId",
  "SignatureDoesNotMatch",
  "ExpiredToken",
  "InvalidToken",
  "NoSuchBucket",
  "NoSuchKey",
  "NotFound",
  "AuthorizationHeaderMalformed",
  "InvalidRequest",
  "InvalidArgument",
  "EntityTooLarge",
  "EntityTooSmall",
  "BadDigest",
  "RequestTimeTooSkewed",
  "RequestTimeout",
  "SlowDown",
  "InternalError",
  "ServiceUnavailable",
]);

export const storageFailureDetailsSchema = z.object({
  code: serviceCodeSchema.optional(),
  httpStatus: z.number().int().min(300).max(599).optional(),
});

export function storageFailureDetails(error: unknown) {
  const parsed = z
    .object({
      name: z.unknown().optional(),
      $metadata: z
        .object({ httpStatusCode: z.unknown().optional() })
        .optional(),
    })
    .safeParse(error);
  const code = serviceCodeSchema.safeParse(parsed.data?.name);
  const httpStatus = storageFailureDetailsSchema.shape.httpStatus.safeParse(
    parsed.data?.$metadata?.httpStatusCode,
  );
  return {
    ...(code.success && code.data ? { code: code.data } : {}),
    ...(httpStatus.success && httpStatus.data
      ? { httpStatus: httpStatus.data }
      : {}),
  };
}

export function isExplicitStorageRejection(error: {
  reason: string;
  details?: z.infer<typeof storageFailureDetailsSchema>;
}) {
  if (error.reason !== "unknown") return true;
  if (
    error.details?.code &&
    [
      "AccessDenied",
      "InvalidAccessKeyId",
      "SignatureDoesNotMatch",
      "ExpiredToken",
      "InvalidToken",
      "NoSuchBucket",
      "NoSuchKey",
      "NotFound",
      "AuthorizationHeaderMalformed",
      "InvalidRequest",
      "InvalidArgument",
      "EntityTooLarge",
      "EntityTooSmall",
      "BadDigest",
      "RequestTimeTooSkewed",
    ].includes(error.details.code)
  )
    return true;
  const status = error.details?.httpStatus;
  // A timeout or server error can follow a committed write.
  return (
    status !== undefined && status >= 400 && status < 500 && status !== 408
  );
}
