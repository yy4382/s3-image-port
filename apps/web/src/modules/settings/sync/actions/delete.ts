import { deleteRemoteProfiles } from "../sync-api-client";

type DeleteResult =
  | { success: true }
  | { success: false; reason: "no-such-user" | "error"; message: string };

/**
 * Deletes the remote profile from the server.
 *
 * @param token - The sync token for authentication
 * @returns The delete result
 */
export async function deleteRemoteSync(token: string): Promise<DeleteResult> {
  const result = await deleteRemoteProfiles(token);

  switch (result._tag) {
    case "success": {
      return { success: true };
    }
    case "no-such-user": {
      return {
        success: false,
        reason: "no-such-user",
        message: "No corresponding profile found on the server",
      };
    }
    case "error": {
      return {
        success: false,
        reason: "error",
        message: "Failed to delete remote sync data",
      };
    }
  }
}
