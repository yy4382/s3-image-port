import { encrypt, decrypt, deriveAuthToken } from "@/lib/encryption/crypto";
import { settingsForSyncSchema } from "../settings-store";
import { settingsForSyncFromUnknown } from "../settings-store";
import { z } from "zod";
import { client } from "@/lib/orpc/client";
import { safe } from "@orpc/client";
import { settingsRecordSchema, settingsResponseSchema } from "./types";

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

/**
 * Upload encrypted profiles to server
 */
export async function uploadProfiles(
  data: z.infer<typeof settingsForSyncSchema>,
  token: string,
  currentVersion: number,
): Promise<
  | {
      success: true;
      version: number;
      current: z.infer<typeof settingsRecordSchema>;
    }
  | {
      success: false;
      conflict: true;
      current: z.infer<typeof settingsRecordSchema>;
    }
  | {
      success: false;
      conflict: false;
      error: string;
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
        return {
          success: false,
          conflict: false,
          error: error.message,
        };
      }
      case "PAYLOAD_TOO_LARGE": {
        return {
          success: false,
          conflict: false,
          error: error.message,
        };
      }
      case "CONFLICT": {
        return {
          success: false,
          conflict: true,
          current: await decryptSettingsInDb(
            settingsResponseSchema.decode(error.data),
            token,
          ),
        };
      }
    }
  } else if (error) {
    throw error;
  }
  return {
    success: true,
    version: fetchData.version,
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

// /**
//  * Delete remote profiles from server
//  */
// async function deleteRemoteProfiles(
//   token: string,
//   _userId: string,
// ): Promise<void> {
//   const authToken = await getAuthToken(token);
//   const response = await fetch(API_BASE, {
//     method: "DELETE",
//     headers: {
//       "Content-Type": "application/json",
//       [AUTH_HEADER]: authToken,
//     },
//   });

//   if (!response.ok) {
//     throw new Error(`Delete failed: ${response.statusText}`);
//   }
// }
