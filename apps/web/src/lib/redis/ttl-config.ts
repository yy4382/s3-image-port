/**
 * Data retention configuration for synced profiles.
 *
 * This module is separate from settings-client to avoid importing
 * server-side dependencies (ioredis) into the client bundle.
 *
 * The TTL is used both server-side (in settings-client) and client-side
 * (in UI to display retention policy to users).
 */

export const PROFILE_TTL_SECONDS = 60 * 60 * 24 * 365; // 365 days
