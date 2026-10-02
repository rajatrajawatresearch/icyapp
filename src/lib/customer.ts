import { prisma } from "./db";
import { randomToken } from "./token";

/** 16 characters ≈ 93 bits — an unguessable bearer link. */
export function generateCustomerToken() {
  return randomToken(16);
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
