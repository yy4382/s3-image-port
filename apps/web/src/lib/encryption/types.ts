import { z } from "zod";

export interface EncryptedData {
  salt: string; // base64-encoded
  iv: string; // base64-encoded
  data: string; // base64-encoded ciphertext
  version: number; // encryption version for future-proofing
}

export const encryptedDataSchema = z.object({
  salt: z.string(),
  iv: z.string(),
  data: z.string(),
  version: z.number(),
});

export class EncryptionError extends Error {
  constructor(
    message: string,
    public readonly cause?: unknown,
  ) {
    super(message);
    this.name = "EncryptionError";
  }
}

export class DecryptionError extends Error {
  constructor(
    message: string,
    public readonly cause?: unknown,
  ) {
    super(message);
    this.name = "DecryptionError";
  }
}
