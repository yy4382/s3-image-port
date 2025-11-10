import { z } from "zod";

export const encryptedDataSchema = z.object({
  salt: z.string(), // base64-encoded
  iv: z.string(), // base64-encoded
  data: z.string(), // base64-encoded ciphertext
  version: z.number(), // encryption version for future-proofing
});
export type EncryptedData = z.infer<typeof encryptedDataSchema>;

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
