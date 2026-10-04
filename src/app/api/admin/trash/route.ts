import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdminApi } from "@/lib/auth";
import { jsonError, parseJson } from "@/lib/api";
import { audit } from "@/lib/audit";
import { DELETE_DELAY_MINUTES, TRASH_ENTITIES } from "@/lib/constants";
import { setScheduledDelete } from "@/lib/trash";

const ScheduleSchema = z.object({
  entity: z.enum(TRASH_ENTITIES),
  id: z.string().min(1),
  minutes: z
    .number()
    .int()
    .refine(
      (m) => (DELETE_DELAY_MINUTES as readonly number[]).includes(m),
      "Invalid delay",
    ),
});

/** POST /api/admin/trash — SUPER_ADMIN schedules a row for permanent deletion after N minutes. */
export async function POST(req: Request) {
  const auth = await requireAdminApi({ superOnly: true });
  if (!auth.ok) return auth.res;
  const body = await parseJson(req, ScheduleSchema);
  if (!body.ok) return body.res;
  const { entity, id, minutes } = body.data;
  if (entity === "account" && id === auth.admin.id)
    return jsonError("You can't delete your own account");

  const deleteAt = new Date(Date.now() + minutes * 60_000);
  const label = await setScheduledDelete(entity, id, {
    from: "none",
    to: deleteAt,
  });
  if (!label)
    return jsonError(
      `That ${entity} doesn't exist or is already being deleted`,
      404,
    );

  await audit(
    auth.admin.id,
    `scheduled_delete_${entity}`,
    id,
    `${label} · deletes in ${minutes} min`,
  );
  return NextResponse.json({
    ok: true,
    scheduledDeleteAt: deleteAt.toISOString(),
  });
}
