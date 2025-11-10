import { encrypt, decrypt, deriveAuthToken } from "@/lib/encryption/crypto";
import { syncSettingsStoreSchema } from "../settings-store";
import { migrateSyncSettingsStoreRawData } from "../settings-store";
import { z } from "zod";
import { client } from "@/lib/orpc/client";
import { safe } from "@orpc/client";
import { settingsInDbEncryptedSchema, settingsInDbSchema } from "./types";

async function decryptSettingsInDb(
  data: z.infer<typeof settingsInDbEncryptedSchema>,
  token: string,
): Promise<z.infer<typeof settingsInDbSchema>> {
  const decrypted = await decrypt(data.data, token);
  const profiles = migrateSyncSettingsStoreRawData(JSON.parse(decrypted));
  return {
    data: profiles,
    version: data.version,
    updatedAt: data.updatedAt,
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
  data: z.infer<typeof syncSettingsStoreSchema>,
  token: string,
  currentVersion: number,
): Promise<
  | {
      success: true;
      version: number;
      current: z.infer<typeof settingsInDbSchema>;
    }
  | {
      success: false;
      conflict: true;
      current: z.infer<typeof settingsInDbSchema>;
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
            settingsInDbEncryptedSchema.decode(error.data),
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
      settingsInDbEncryptedSchema.decode(fetchData),
      token,
    ),
  };
}

/**
 * Fetch and decrypt remote profiles
 */
export async function fetchRemoteProfiles(
  token: string,
): Promise<z.infer<typeof settingsInDbSchema> | null> {
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
      case "NOT_FOUND": {
        return null;
      }
    }
  } else if (error) {
    throw error;
  }
  return await decryptSettingsInDb(
    settingsInDbEncryptedSchema.decode(fetchData),
    token,
  );
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

// /**
//  * Check if remote profile exists and get version info
//  */
// async function checkRemoteVersion(
//   _userId: string,
//   token: string,
// ): Promise<{ exists: boolean; version?: number; updatedAt?: number }> {
//   try {
//     const authToken = await getAuthToken(token);
//     const response = await fetch(API_BASE, {
//       headers: {
//         [AUTH_HEADER]: authToken,
//       },
//     });

//     if (!response.ok) {
//       return { exists: false };
//     }

//     const stored: StoredProfile | null = await response.json();

//     if (!stored) {
//       return { exists: false };
//     }

//     return {
//       exists: true,
//       version: stored.version,
//       updatedAt: stored.updatedAt,
//     };
//   } catch {
//     return { exists: false };
//   }
// }
