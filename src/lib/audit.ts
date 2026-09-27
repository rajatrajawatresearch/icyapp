import { prisma } from "./db";

export async function audit(
  actorAdminId: string,
  action: string,
  targetId: string,
  details?: string,
) {
  await prisma.auditLog.create({
    data: { actorAdminId, action, targetId, details },
  });
}
