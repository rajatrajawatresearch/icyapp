import { cache } from "react";
import type { Customer } from "@prisma/client";
import { prisma } from "./db";
import { readDeviceId } from "./device";
import { linkClosed } from "./link-expiry";
import { randomToken, sha256 } from "./token";

/** 32 random characters: a long link that says nothing and can't be guessed. */
export function generateCustomerToken() {
  return randomToken(32);
}

export type CustomerAccess =
  /** Unknown link, revoked, closed after the order was finished, or the customer is being deleted. */
  | { state: "invalid" }
  /** A good link that no device has opened yet. */
  | { state: "unclaimed" }
  /** A good link, but it belongs to another device. */
  | { state: "locked" }
  | { state: "ok"; customer: Customer };

/**
 * Who is behind a private link, and whether this device may use it (see
 * lib/device.ts). Cached per request: a page and its layout share one lookup.
 */
export const customerAccess = cache(
  async (token: string): Promise<CustomerAccess> => {
    if (!token || token.length > 64) return { state: "invalid" };
    const customer = await prisma.customer.findUnique({ where: { token } });
    if (
      !customer ||
      !customer.isActive ||
      customer.scheduledDeleteAt ||
      linkClosed(customer)
    )
      return { state: "invalid" };
    if (!customer.deviceHash) return { state: "unclaimed" };
    const device = await readDeviceId();
    if (!device || sha256(device) !== customer.deviceHash)
      return { state: "locked" };
    return { state: "ok", customer };
  },
);

/**
 * The customer for a private link, or null unless the link is live AND this
 * request comes from the device the link belongs to. Every customer API goes
 * through this, so a forwarded link is useless there too.
 */
export async function resolveCustomer(token: string) {
  const access = await customerAccess(token);
  return access.state === "ok" ? access.customer : null;
}
