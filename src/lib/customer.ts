import crypto from "crypto";
import { prisma } from "./db";

const TOKEN_ALPHABET =
  "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789";
const TOKEN_LENGTH = 16;

/** 16 chars from a 57-char alphabet ≈ 93 bits — unguessable bearer link. */
export function generateCustomerToken() {
  const bytes = crypto.randomBytes(TOKEN_LENGTH * 2);
  let out = "";
  for (const b of bytes) {
    // Rejection sampling keeps the distribution uniform.
    if (b >= Math.floor(256 / TOKEN_ALPHABET.length) * TOKEN_ALPHABET.length)
      continue;
    out += TOKEN_ALPHABET[b % TOKEN_ALPHABET.length];
    if (out.length === TOKEN_LENGTH) return out;
  }
  return generateCustomerToken();
}

/**
 * Resolves a customer from their private link. Returns null when the link is
 * unknown, revoked (isActive=false) or the customer is scheduled for deletion.
 */
export async function resolveCustomer(token: string) {
  if (!token || token.length > 64) return null;
  const customer = await prisma.customer.findUnique({ where: { token } });
  if (!customer || !customer.isActive || customer.scheduledDeleteAt)
    return null;
  return customer;
}
