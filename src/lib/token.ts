import crypto from "crypto";

// No look-alike characters (0/O, 1/l/I), so links survive being read aloud.
const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789";

/** Uniform random token for private links (≈5.8 bits per character). */
export function randomToken(length: number): string {
  const limit = Math.floor(256 / ALPHABET.length) * ALPHABET.length;
  let out = "";
  while (out.length < length) {
    for (const b of crypto.randomBytes(length * 2)) {
      // Rejection sampling keeps the distribution uniform.
      if (b >= limit) continue;
      out += ALPHABET[b % ALPHABET.length];
      if (out.length === length) break;
    }
  }
  return out;
}

export function sha256(text: string) {
  return crypto.createHash("sha256").update(text).digest("hex");
}
