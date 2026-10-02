import { prisma } from "./db";
import { randomToken, sha256 } from "./token";

// Staff sign-in links: /a/<token>. Like a customer's link, but it opens the
// admin or delivery panel, so only a hash is stored and the link itself is
// shown once — when it is created or refreshed.

const ACCESS_TOKEN_LENGTH = 32; // ≈186 bits

export function accessLinkPath(token: string) {
  return `/a/${token}`;
}

/**
 * Issues a fresh link for an account. The previous link stops working, every
 * existing session of that account is signed out, and its push subscriptions
 * are dropped — so refreshing really does cut off whoever held the old link.
 */
export async function refreshAccessLink(adminId: string) {
  const token = randomToken(ACCESS_TOKEN_LENGTH);
  const [admin] = await prisma.$transaction([
    prisma.admin.update({
      where: { id: adminId },
      data: {
        accessTokenHash: sha256(token),
        accessTokenAt: new Date(),
        sessionVersion: { increment: 1 },
      },
    }),
    prisma.pushSubscription.deleteMany({ where: { adminId } }),
  ]);
  return { token, admin };
}

/** Turns the link off without touching sessions (password sign-in still works). */
export async function disableAccessLink(adminId: string) {
  return prisma.admin.update({
    where: { id: adminId },
    data: { accessTokenHash: null, accessTokenAt: null },
  });
}

/** The active account behind a link, or null. */
export async function resolveAccessLink(token: string) {
  if (token.length !== ACCESS_TOKEN_LENGTH) return null;
  const admin = await prisma.admin.findUnique({
    where: { accessTokenHash: sha256(token) },
  });
  return admin?.isActive ? admin : null;
}
