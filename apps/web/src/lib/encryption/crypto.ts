import { EncryptedData, EncryptionError, DecryptionError } from "./types";

const ENCRYPTION_VERSION = 1;
const PBKDF2_ITERATIONS = 600_000; // OWASP 2023 recommendation
const SALT_LENGTH = 32; // 256 bits
const IV_LENGTH = 12; // 96 bits for AES-GCM
const KEY_LENGTH = 256; // 256-bit AES key

/**
 * Converts ArrayBuffer to base64 string
 */
function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

/**
 * Converts base64 string to Uint8Array
 */
function base64ToUint8Array(base64: string): Uint8Array {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

/**
 * Generate a random salt for PBKDF2
 */
function generateSalt(): Uint8Array {
  return crypto.getRandomValues(new Uint8Array(SALT_LENGTH));
}

/**
 * Generate a random IV for AES-GCM
 */
function generateIV(): Uint8Array {
  return crypto.getRandomValues(new Uint8Array(IV_LENGTH));
}

/**
 * Derive an encryption key from a passphrase using PBKDF2
 */
async function deriveKey(
  passphrase: string,
  salt: Uint8Array,
): Promise<CryptoKey> {
  try {
    const encoder = new TextEncoder();
    const passphraseKey = await crypto.subtle.importKey(
      "raw",
      encoder.encode(passphrase),
      "PBKDF2",
      false,
      ["deriveKey"],
    );

    return await crypto.subtle.deriveKey(
      {
        name: "PBKDF2",
        salt: salt as BufferSource,
        iterations: PBKDF2_ITERATIONS,
        hash: "SHA-256",
      },
      passphraseKey,
      {
        name: "AES-GCM",
        length: KEY_LENGTH,
      },
      false,
      ["encrypt", "decrypt"],
    );
  } catch (error) {
    throw new EncryptionError("Failed to derive encryption key", error);
  }
}

/**
 * Encrypt data using AES-GCM with a passphrase-derived key
 * @param data - Plain text data to encrypt
 * @param passphrase - User passphrase
 * @returns Encrypted data with salt, IV, and ciphertext
 */
export async function encrypt(
  data: string,
  passphrase: string,
): Promise<EncryptedData> {
  try {
    const salt = generateSalt();
    const iv = generateIV();
    const key = await deriveKey(passphrase, salt);

    const encoder = new TextEncoder();
    const encodedData = encoder.encode(data);

    const ciphertext = await crypto.subtle.encrypt(
      {
        name: "AES-GCM",
        iv: iv as BufferSource,
      },
      key,
      encodedData,
    );

    return {
      salt: arrayBufferToBase64(salt.buffer as ArrayBuffer),
      iv: arrayBufferToBase64(iv.buffer as ArrayBuffer),
      data: arrayBufferToBase64(ciphertext),
      version: ENCRYPTION_VERSION,
    };
  } catch (error) {
    throw new EncryptionError("Failed to encrypt data", error);
  }
}

/**
 * Decrypt data using AES-GCM with a passphrase-derived key
 * @param encryptedData - Encrypted data object
 * @param passphrase - User passphrase
 * @returns Decrypted plain text
 */
export async function decrypt(
  encryptedData: EncryptedData,
  passphrase: string,
): Promise<string> {
  try {
    // Version check for future migrations
    if (encryptedData.version !== ENCRYPTION_VERSION) {
      throw new DecryptionError(
        `Unsupported encryption version: ${encryptedData.version}`,
      );
    }

    const salt = base64ToUint8Array(encryptedData.salt);
    const iv = base64ToUint8Array(encryptedData.iv);
    const ciphertext = base64ToUint8Array(encryptedData.data);

    const key = await deriveKey(passphrase, salt);

    const decrypted = await crypto.subtle.decrypt(
      {
        name: "AES-GCM",
        iv: iv as BufferSource,
      },
      key,
      ciphertext as BufferSource,
    );

    const decoder = new TextDecoder();
    return decoder.decode(decrypted);
  } catch (error) {
    if (error instanceof DecryptionError) {
      throw error;
    }
    // Wrong passphrase or corrupted data
    throw new DecryptionError(
      "Failed to decrypt data. Passphrase may be incorrect.",
      error,
    );
  }
}

/**
 * Validate passphrase strength
 * @param passphrase - Passphrase to validate
 * @returns Object with validation result and message
 */
export function validatePassphrase(passphrase: string): {
  valid: boolean;
  message?: string;
} {
  if (passphrase.length < 12) {
    return {
      valid: false,
      message: "Passphrase must be at least 12 characters long",
    };
  }

  if (passphrase.length >= 16) {
    return { valid: true };
  }

  // For 12-15 chars, require some complexity
  const hasLower = /[a-z]/.test(passphrase);
  const hasUpper = /[A-Z]/.test(passphrase);
  const hasNumber = /\d/.test(passphrase);
  const hasSpecial = /[^a-zA-Z\d]/.test(passphrase);

  const complexityCount = [hasLower, hasUpper, hasNumber, hasSpecial].filter(
    Boolean,
  ).length;

  if (complexityCount < 3) {
    return {
      valid: false,
      message:
        "Passphrase must contain at least 3 of: lowercase, uppercase, numbers, special characters",
    };
  }

  return { valid: true };
}
