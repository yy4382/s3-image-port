import {
  generateMnemonic,
  mnemonicToEntropy,
  entropyToMnemonic,
  validateMnemonic,
} from "@scure/bip39";
import { wordlist } from "@scure/bip39/wordlists/english.js";

export const SYNC_TOKEN_STORAGE_KEY = "s3ip:sync-token";

export type WordCount = 12 | 15 | 18 | 21 | 24;

const WORD_COUNT_TO_STRENGTH: Record<WordCount, number> = {
  12: 128,
  15: 160,
  18: 192,
  21: 224,
  24: 256,
};

export function createSyncToken(wordCount: WordCount = 12): string {
  const strength = WORD_COUNT_TO_STRENGTH[wordCount];
  if (!strength) {
    throw new Error(`Unsupported word count: ${wordCount}`);
  }

  const mnemonic = generateMnemonic(wordlist, strength);
  return normalizeSyncToken(mnemonic);
}

export function normalizeSyncToken(token: string): string {
  return token.trim().toLowerCase().split(/\s+/).filter(Boolean).join(" ");
}

export function isValidSyncToken(token: string): boolean {
  try {
    const normalized = normalizeSyncToken(token);
    return validateMnemonic(normalized, wordlist);
  } catch {
    return false;
  }
}

export function assertValidSyncToken(token: string): string {
  const normalized = normalizeSyncToken(token);
  if (!isValidSyncToken(normalized)) {
    throw new Error("Invalid sync token");
  }
  return normalized;
}

export function syncTokenToEntropy(token: string): Uint8Array {
  const normalized = assertValidSyncToken(token);
  return mnemonicToEntropy(normalized, wordlist);
}

export function entropyToSyncToken(entropy: Uint8Array): string {
  return normalizeSyncToken(entropyToMnemonic(entropy, wordlist));
}

export function getTokenPreview(token: string): string {
  const normalized = normalizeSyncToken(token);
  if (!normalized) {
    return "";
  }
  const segments = normalized.split(" ");
  const preview = segments.slice(0, 2).join(" ");
  return segments.length > 2 ? `${preview} …` : preview;
}
