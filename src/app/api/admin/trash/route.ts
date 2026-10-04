import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdminApi } from "@/lib/auth";
import { jsonError, parseJson } from "@/lib/api";
import { audit } from "@/lib/audit";
import { DELETE_DELAY_SECONDS, TRASH_ENTITIES } from "@/lib/constants";
import { purgeExpired } from "@/lib/purge";
import { setScheduledDelete } from "@/lib/trash";

const ScheduleSchema = z.object({
  entity: z.enum(TRASH_ENTITIES),
  id: z.string().min(1),
  /** Seconds until it is gone for good; 0 deletes at once, with no undo. */
  seconds: z
    .number()
    .int()
    .refine(
      (s) => (DELETE_DELAY_SECONDS as readonly number[]).includes(s),
      "Invalid delay",
    ),
});

/** POST /api/admin/trash — SUPER_ADMIN deletes a row: at once, or after a delay during which it can be undone. */
export async function POST(req: Request) {
  const auth = await requireAdminApi({ superOnly: true });
  if (!auth.ok) return auth.res;
  const body = await parseJson(req, ScheduleSchema);
  if (!body.ok) return body.res;
  const { entity, id, seconds } = body.data;
  if (entity === "account" && id === auth.admin.id)
    return jsonError("You can't delete your own account");

  const deleteAt = new Date(Date.now() + seconds * 1000);
  const label = await setScheduledDelete(entity, id, {
    from: "none",
    to: deleteAt,
  });
  if (!label)
    return jsonError(
      `That ${entity} doesn't exist or is already being deleted`,
      404,
    );

  // "Instantly" means gone before this answer is sent.
  if (seconds === 0) await purgeExpired({ force: true });

  await audit(
    auth.admin.id,
    seconds === 0 ? `deleted_${entity}` : `scheduled_delete_${entity}`,
    id,
    seconds === 0 ? `${label} · deleted at once` : `${label} · deletes in ${seconds}s`,
  );
  return NextResponse.json({
    ok: true,
    scheduledDeleteAt: deleteAt.toISOString(),
  });
}
