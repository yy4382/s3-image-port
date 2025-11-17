import { encrypt, decrypt, deriveAuthToken } from "@/lib/encryption/crypto";
import { settingsForSyncSchema } from "../settings-store";
import { settingsForSyncFromUnknown } from "../settings-store";
import { z } from "zod";
import { client } from "@/lib/orpc/client";
import { InferClientErrors, ORPCError, safe } from "@orpc/client";
import { settingsRecordSchema, settingsResponseSchema } from "./types";
import { assertUnreachable } from "@/lib/utils/assert-unreachable";

async function decryptSettingsInDb(
  data: z.infer<typeof settingsResponseSchema>,
  token: string,
): Promise<z.infer<typeof settingsRecordSchema>> {
  const decrypted = await decrypt(data.data, token);
  const profiles = settingsForSyncFromUnknown(JSON.parse(decrypted));
  return {
    ...data,
    data: profiles,
  };
}

async function getAuthToken(token: string): Promise<string> {
  if (!token) {
    throw new Error("Sync token is required for sync operations");
  }
  return deriveAuthToken(token);
}

type UploadProfileErrors =
  | Exclude<
      Extract<
        InferClientErrors<typeof client.profiles.upload>,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        ORPCError<any, any>
      >,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ORPCError<"CONFLICT", any>
    >
  | ORPCError<"CONFLICT", z.infer<typeof settingsRecordSchema>>;
export class UploadProfileError extends Error {
  cause: UploadProfileErrors;
  constructor(cause: UploadProfileErrors) {
    super(cause.message);
    this.cause = cause;
  }
}
/**
 * Upload encrypted profiles to server
 */
export async function uploadProfiles(
  data: z.infer<typeof settingsForSyncSchema>,
  token: string,
  currentVersion: number | "force",
): Promise<
  | {
      success: true;
      current: z.infer<typeof settingsRecordSchema>;
    }
  | {
      success: false;
      error: UploadProfileErrors;
    }
> {
  const serialized = JSON.stringify(data);
  const encrypted = await encrypt(serialized, token);

  const authToken = await getAuthToken(token);

  const {
    error,
    data: fetchData,
    isDefined,
  } = await safe(
    client.profiles.upload({
      token: authToken,
      data: encrypted,
      version: currentVersion,
    }),
  );
  if (isDefined) {
    switch (error.code) {
      case "INPUT_VALIDATION_FAILED": {
        return { success: false, error };
      }
      case "PAYLOAD_TOO_LARGE": {
        return { success: false, error };
      }
      case "CONFLICT": {
        const decrypted = await decryptSettingsInDb(
          settingsResponseSchema.decode(error.data),
          token,
        );
        const transformed = new ORPCError("CONFLICT", {
          ...error,
          data: decrypted,
        });
        return {
          success: false,
          error: transformed,
        };
      }
      case "TOO_MANY_REQUESTS": {
        return { success: false, error };
        // const retryAfterMs =
        //   typeof error.data?.reset === "number"
        //     ? Math.max(0, error.data.reset - Date.now())
        //     : undefined;
      }
      default: {
        assertUnreachable(error);
      }
    }
  } else if (error) {
    throw error;
  }
  return {
    success: true,
    current: await decryptSettingsInDb(
      settingsResponseSchema.decode(fetchData),
      token,
    ),
  };
}

/**
 * Fetch and decrypt remote profiles
 */
export async function fetchRemoteProfiles(
  token: string,
): Promise<z.infer<typeof settingsRecordSchema> | null> {
  const authToken = await getAuthToken(token);
  const {
    error,
    data: fetchData,
    isDefined,
  } = await safe(client.profiles.fetch({ token: authToken }));
  if (isDefined) {
    switch (error.code) {
      case "INPUT_VALIDATION_FAILED": {
        throw new Error(error.data.fieldErrors.token?.join(", "));
      }
      case "BAD_REQUEST": {
        if (error.data.type === "no-such-user") {
          return null;
        }
        throw new Error(error.message);
      }
    }
  } else if (error) {
    throw error;
  }
  return await decryptSettingsInDb(
    settingsResponseSchema.decode(fetchData),
    token,
  );
}

const _metadataSchema = settingsResponseSchema.omit({ data: true });
export async function fetchMetadata(
  token: string,
): Promise<z.infer<typeof _metadataSchema> | null> {
  const authToken = await getAuthToken(token);
  const {
    error,
    data: fetchData,
    isDefined,
  } = await safe(client.profiles.fetchMetadata({ token: authToken }));
  if (isDefined) {
    switch (error.code) {
      case "INPUT_VALIDATION_FAILED": {
        throw new Error(error.data.fieldErrors.token?.join(", "));
      }
      case "BAD_REQUEST": {
        if (error.data.type === "no-such-user") {
          return null;
        }
        throw new Error(error.message);
      }
    }
  } else if (error) {
    throw error;
  }
  return fetchData;
}

const DeleteRemoteResultType = {
  SUCCESS: "success",
  NO_SUCH_USER: "no-such-user",
  ERROR: "error",
} as const;
type DeleteRemoteResult =
  | {
      _tag: typeof DeleteRemoteResultType.SUCCESS;
    }
  | {
      _tag: typeof DeleteRemoteResultType.NO_SUCH_USER;
    }
  | {
      _tag: typeof DeleteRemoteResultType.ERROR;
      error: string;
    };
/**
 * Delete remote profiles from server
 */
export async function deleteRemoteProfiles(
  token: string,
): Promise<DeleteRemoteResult> {
  const authToken = await getAuthToken(token);
  const { error, isDefined } = await safe(
    client.profiles.delete({ token: authToken }),
  );
  if (isDefined) {
    switch (error.code) {
      case "INPUT_VALIDATION_FAILED": {
        throw new Error(error.data.fieldErrors.token?.join(", "));
      }
      case "BAD_REQUEST": {
        if (error.data.type === "no-such-user") {
          return { _tag: DeleteRemoteResultType.NO_SUCH_USER };
        }
        return { _tag: DeleteRemoteResultType.ERROR, error: error.message };
      }
    }
  } else if (error) {
    throw error;
  }
  return { _tag: DeleteRemoteResultType.SUCCESS };
}
