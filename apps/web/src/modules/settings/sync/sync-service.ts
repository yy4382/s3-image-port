import { encrypt, decrypt, deriveAuthToken } from "@/lib/encryption/crypto";
import { EncryptedData } from "@/lib/encryption/types";
import type { Options } from "../settings-store";
import { profilesSchema } from "../settings-store";
import { profilesSchemaForLoad } from "../schema/v3";
import { z } from "zod";
import * as Diff from "diff";

const API_BASE = "/api/sync/profiles";
const AUTH_HEADER = "x-sync-auth";

interface StoredProfile {
  data: EncryptedData;
  version: number;
  updatedAt: number;
}

export interface ProfilesDiff {
  hasChanges: boolean;
  added: Array<[string, Options]>;
  removed: Array<[string, Options]>;
  modified: Array<{
    name: string;
    local: Options;
    remote: Options;
    changes: ProfileChanges;
  }>;
  currentIndexChanged: boolean;
  localCurrentIndex: number;
  remoteCurrentIndex: number;
}

export interface ProfileChanges {
  s3?: {
    endpoint?: { from: string; to: string };
    bucket?: { from: string; to: string };
    region?: { from: string; to: string };
    accKeyId?: { from: string; to: string };
    secretAccKey?: { from: string; to: string };
    forcePathStyle?: { from: boolean; to: boolean };
    pubUrl?: { from: string; to: string };
  };
  upload?: {
    keyTemplate?: { from: string; to: string };
    keyTemplatePresets?: {
      from: Array<{ key: string; value: string }> | undefined;
      to: Array<{ key: string; value: string }> | undefined;
    };
    compressionOption?: { from: unknown; to: unknown };
  };
  gallery?: {
    autoRefresh?: { from: boolean; to: boolean };
  };
}

type Profiles = z.infer<typeof profilesSchema>;

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
  profiles: Profiles,
  token: string,
  _userId: string,
  currentVersion: number,
): Promise<{ success: boolean; version: number; conflict?: boolean }> {
  const serialized = JSON.stringify(profiles);
  const encrypted = await encrypt(serialized, token);

  const authToken = await getAuthToken(token);

  const response = await fetch(API_BASE, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      [AUTH_HEADER]: authToken,
    },
    body: JSON.stringify({
      data: encrypted,
      version: currentVersion + 1,
    }),
  });

  if (!response.ok) {
    if (response.status === 409) {
      await response.json(); // Consume response body
      return { success: false, version: currentVersion, conflict: true };
    }
    throw new Error(`Upload failed: ${response.statusText}`);
  }

  const result = await response.json();
  return result;
}

/**
 * Fetch and decrypt remote profiles
 */
export async function fetchRemoteProfiles(
  token: string,
  _userId: string,
): Promise<{ profiles: Profiles; version: number; updatedAt: number } | null> {
  const authToken = await getAuthToken(token);
  const response = await fetch(API_BASE, {
    headers: {
      [AUTH_HEADER]: authToken,
    },
  });

  if (!response.ok) {
    throw new Error(`Fetch failed: ${response.statusText}`);
  }

  const stored: StoredProfile | null = await response.json();

  if (!stored) {
    return null;
  }

  const decrypted = await decrypt(stored.data, token);
  const profiles = profilesSchemaForLoad.parse(JSON.parse(decrypted));

  return {
    profiles,
    version: stored.version,
    updatedAt: stored.updatedAt,
  };
}

/**
 * Delete remote profiles from server
 */
export async function deleteRemoteProfiles(
  token: string,
  _userId: string,
): Promise<void> {
  const authToken = await getAuthToken(token);
  const response = await fetch(API_BASE, {
    method: "DELETE",
    headers: {
      "Content-Type": "application/json",
      [AUTH_HEADER]: authToken,
    },
  });

  if (!response.ok) {
    throw new Error(`Delete failed: ${response.statusText}`);
  }
}

/**
 * Check if remote profile exists and get version info
 */
export async function checkRemoteVersion(
  _userId: string,
  token: string,
): Promise<{ exists: boolean; version?: number; updatedAt?: number }> {
  try {
    const authToken = await getAuthToken(token);
    const response = await fetch(API_BASE, {
      headers: {
        [AUTH_HEADER]: authToken,
      },
    });

    if (!response.ok) {
      return { exists: false };
    }

    const stored: StoredProfile | null = await response.json();

    if (!stored) {
      return { exists: false };
    }

    return {
      exists: true,
      version: stored.version,
      updatedAt: stored.updatedAt,
    };
  } catch {
    return { exists: false };
  }
}

/**
 * Compare local and remote profiles to generate diff
 */
export function compareProfiles(
  local: Profiles,
  remote: Profiles,
): ProfilesDiff {
  const diff: ProfilesDiff = {
    hasChanges: false,
    added: [],
    removed: [],
    modified: [],
    currentIndexChanged: local.current !== remote.current,
    localCurrentIndex: local.current,
    remoteCurrentIndex: remote.current,
  };

  // Create maps for easier comparison
  const localMap = new Map(local.list);
  const remoteMap = new Map(remote.list);

  // Find added and modified profiles
  for (const [name, remoteOptions] of remote.list) {
    if (!localMap.has(name)) {
      diff.added.push([name, remoteOptions]);
      diff.hasChanges = true;
    } else {
      const localOptions = localMap.get(name)!;
      const changes = compareOptions(localOptions, remoteOptions);
      if (Object.keys(changes).length > 0) {
        diff.modified.push({
          name,
          local: localOptions,
          remote: remoteOptions,
          changes,
        });
        diff.hasChanges = true;
      }
    }
  }

  // Find removed profiles
  for (const [name, localOptions] of local.list) {
    if (!remoteMap.has(name)) {
      diff.removed.push([name, localOptions]);
      diff.hasChanges = true;
    }
  }

  if (diff.currentIndexChanged) {
    diff.hasChanges = true;
  }

  return diff;
}

/**
 * Compare two Options objects and return differences
 */
function compareOptions(local: Options, remote: Options): ProfileChanges {
  const changes: ProfileChanges = {};

  // Compare S3 settings
  if (JSON.stringify(local.s3) !== JSON.stringify(remote.s3)) {
    const s3Changes: Record<string, { from: unknown; to: unknown }> = {};
    for (const key of Object.keys(remote.s3) as Array<keyof typeof remote.s3>) {
      if (local.s3[key] !== remote.s3[key]) {
        s3Changes[key] = { from: local.s3[key], to: remote.s3[key] };
      }
    }
    if (Object.keys(s3Changes).length > 0) {
      changes.s3 = s3Changes as ProfileChanges["s3"];
    }
  }

  // Compare upload settings
  if (JSON.stringify(local.upload) !== JSON.stringify(remote.upload)) {
    changes.upload = {};
    if (local.upload.keyTemplate !== remote.upload.keyTemplate) {
      changes.upload.keyTemplate = {
        from: local.upload.keyTemplate,
        to: remote.upload.keyTemplate,
      };
    }
    if (
      JSON.stringify(local.upload.keyTemplatePresets) !==
      JSON.stringify(remote.upload.keyTemplatePresets)
    ) {
      changes.upload.keyTemplatePresets = {
        from: local.upload.keyTemplatePresets,
        to: remote.upload.keyTemplatePresets,
      };
    }
    if (
      JSON.stringify(local.upload.compressionOption) !==
      JSON.stringify(remote.upload.compressionOption)
    ) {
      changes.upload.compressionOption = {
        from: local.upload.compressionOption,
        to: remote.upload.compressionOption,
      };
    }
  }

  // Compare gallery settings
  if (JSON.stringify(local.gallery) !== JSON.stringify(remote.gallery)) {
    changes.gallery = {};
    if (local.gallery.autoRefresh !== remote.gallery.autoRefresh) {
      changes.gallery.autoRefresh = {
        from: local.gallery.autoRefresh,
        to: remote.gallery.autoRefresh,
      };
    }
  }

  return changes;
}

/**
 * Generate a text diff for display purposes
 */
export function generateTextDiff(local: Profiles, remote: Profiles): string {
  const localJson = JSON.stringify(local, null, 2);
  const remoteJson = JSON.stringify(remote, null, 2);

  const patch = Diff.createPatch(
    "profiles",
    localJson,
    remoteJson,
    "Local",
    "Remote",
  );

  return patch;
}
