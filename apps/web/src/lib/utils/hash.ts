/**
 * Cross-platform SHA-256 hash implementation
 * Works in both browser and Node.js environments
 */

/**
 * Compute SHA-256 hash of a string and return as hex string
 * @param data - String to hash
 * @returns Hex-encoded hash string
 */
export async function sha256(data: string): Promise<string> {
  // Check if we're in a browser environment
  if (typeof window !== "undefined" && window.crypto?.subtle) {
    // Browser: Use Web Crypto API
    const encoder = new TextEncoder();
    const dataBuffer = encoder.encode(data);
    const hashBuffer = await crypto.subtle.digest("SHA-256", dataBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
  }

  // Node.js: Use node:crypto
  // Dynamic import to avoid bundling node:crypto in browser builds
  const { createHash } = await import("node:crypto");
  return createHash("sha256").update(data).digest("hex");
}
