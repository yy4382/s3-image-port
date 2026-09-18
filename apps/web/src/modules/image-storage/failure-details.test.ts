import { describe, expect, it } from "vitest";
import {
  isExplicitStorageRejection,
  storageFailureDetails,
} from "./failure-details";

describe("safe storage failure details", () => {
  it("retains only recognized codes and HTTP status, excluding request signatures and credentials", () => {
    const error = Object.assign(
      new Error("secret-key https://host?X-Amz-Signature=secret"),
      {
        name: "SignatureDoesNotMatch",
        $metadata: { httpStatusCode: 403, requestId: "secret-request" },
        request: { headers: { Authorization: "secret" } },
        cause: "secret",
      },
    );
    expect(storageFailureDetails(error)).toEqual({
      code: "SignatureDoesNotMatch",
      httpStatus: 403,
    });
    expect(
      storageFailureDetails({
        name: "secret-token",
        $metadata: { httpStatusCode: "secret" },
      }),
    ).toEqual({});
    expect(storageFailureDetails(null)).toEqual({});
  });

  it.each([400, 403, 404, 429])(
    "recognizes HTTP %s as a rejection",
    (httpStatus) => {
      expect(
        isExplicitStorageRejection({
          reason: "unknown",
          details: { httpStatus },
        }),
      ).toBe(true);
    },
  );
  it.each([undefined, 408, 500, 503])(
    "does not infer a failed write from HTTP %s",
    (httpStatus) => {
      expect(
        isExplicitStorageRejection({
          reason: "unknown",
          details: { httpStatus },
        }),
      ).toBe(false);
    },
  );
  it("recognizes a service rejection even without HTTP metadata", () => {
    expect(
      isExplicitStorageRejection({
        reason: "unknown",
        details: { code: "InvalidAccessKeyId" },
      }),
    ).toBe(true);
    expect(
      isExplicitStorageRejection({
        reason: "unknown",
        details: { code: "RequestTimeout" },
      }),
    ).toBe(false);
  });
});
