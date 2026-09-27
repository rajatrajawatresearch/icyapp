import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdminApi } from "@/lib/auth";
import { jsonError, parseJson } from "@/lib/api";
import { audit } from "@/lib/audit";
import { TRASH_ENTITIES } from "@/lib/constants";
import { setScheduledDelete } from "@/lib/trash";

const UndoSchema = z.object({
  entity: z.enum(TRASH_ENTITIES),
  id: z.string().min(1),
});

/** POST /api/admin/trash/undo — cancel a pending delete while its timer is still running. */
export async function POST(req: Request) {
  const auth = await requireAdminApi({ superOnly: true });
  if (!auth.ok) return auth.res;
  const body = await parseJson(req, UndoSchema);
  if (!body.ok) return body.res;
  const { entity, id } = body.data;

  const label = await setScheduledDelete(entity, id, {
    from: "pending",
    to: null,
  });
  if (!label)
    return jsonError("Too late — it has already been permanently deleted", 410);

  await audit(auth.admin.id, `undo_delete_${entity}`, id, label);
  return NextResponse.json({ ok: true });
}
