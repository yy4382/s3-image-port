import { describe, it, expect } from "vitest";
import {
  encrypt,
  decrypt,
  validatePassphrase,
  deriveAuthToken,
} from "./crypto";

describe("Encryption utilities", () => {
  const testData = "Hello, World!";
  const passphrase = "my-super-secret-passphrase-123";

  describe("encrypt/decrypt", () => {
    it("should encrypt and decrypt data successfully", async () => {
      const encrypted = await encrypt(testData, passphrase);

      expect(encrypted).toHaveProperty("salt");
      expect(encrypted).toHaveProperty("iv");
      expect(encrypted).toHaveProperty("data");
      expect(encrypted).toHaveProperty("version");

      const decrypted = await decrypt(encrypted, passphrase);
      expect(decrypted).toBe(testData);
    });

    it("should produce different encrypted output for same input", async () => {
      const encrypted1 = await encrypt(testData, passphrase);
      const encrypted2 = await encrypt(testData, passphrase);

      // Salt and IV should be different each time
      expect(encrypted1.salt).not.toBe(encrypted2.salt);
      expect(encrypted1.iv).not.toBe(encrypted2.iv);
      expect(encrypted1.data).not.toBe(encrypted2.data);
    });

    it("should fail to decrypt with wrong passphrase", async () => {
      const encrypted = await encrypt(testData, passphrase);

      await expect(decrypt(encrypted, "wrong-passphrase")).rejects.toThrow();
    });

    it("should handle empty strings", async () => {
      const encrypted = await encrypt("", passphrase);
      const decrypted = await decrypt(encrypted, passphrase);
      expect(decrypted).toBe("");
    });

    it("should handle large data", async () => {
      const largeData = JSON.stringify({
        profiles: Array(100).fill({
          name: "Test Profile",
          settings: { key: "value".repeat(100) },
        }),
      });

      const encrypted = await encrypt(largeData, passphrase);
      const decrypted = await decrypt(encrypted, passphrase);
      expect(decrypted).toBe(largeData);
    });
  });

  describe("validatePassphrase", () => {
    it("should reject passphrases shorter than 12 characters", () => {
      const result = validatePassphrase("short");
      expect(result.valid).toBe(false);
      expect(result.message).toContain("at least 12 characters");
    });

    it("should accept passphrases 16+ characters", () => {
      const result = validatePassphrase("this-is-a-very-long-passphrase");
      expect(result.valid).toBe(true);
      expect(result.message).toBeUndefined();
    });

    it("should require complexity for 12-15 character passphrases", () => {
      const result = validatePassphrase("simplesimple");
      expect(result.valid).toBe(false);
      expect(result.message).toContain("at least 3 of");
    });

    it("should accept complex 12-15 character passphrases", () => {
      const result = validatePassphrase("Complex123!@");
      expect(result.valid).toBe(true);
    });
  });

  describe("deriveAuthToken", () => {
    it("produces deterministic token for same inputs", async () => {
      const token1 = await deriveAuthToken(passphrase, "user-123");
      const token2 = await deriveAuthToken(passphrase, "user-123");
      expect(token1).toBe(token2);
    });

    it("produces different tokens for different users/passphrases", async () => {
      const token1 = await deriveAuthToken(passphrase, "user-123");
      const token2 = await deriveAuthToken("another-passphrase", "user-123");
      const token3 = await deriveAuthToken(passphrase, "user-456");

      expect(token1).not.toBe(token2);
      expect(token1).not.toBe(token3);
      expect(token2).not.toBe(token3);
    });
  });
});
