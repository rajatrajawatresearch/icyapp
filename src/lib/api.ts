import { NextResponse } from "next/server";
import type { z } from "zod";

export function jsonError(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

/** Parses a JSON body against a zod schema; returns either data or a 400 response. */
export async function parseJson<T extends z.ZodType>(
  req: Request,
  schema: T,
): Promise<{ ok: true; data: z.infer<T> } | { ok: false; res: NextResponse }> {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return { ok: false, res: jsonError("Invalid JSON body") };
  }
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    const where = issue?.path.length ? `${issue.path.join(".")}: ` : "";
    return {
      ok: false,
      res: jsonError(`${where}${issue?.message ?? "Invalid input"}`),
    };
  }
  return { ok: true, data: parsed.data };
}

/** Thrown inside transactions to abort with a user-facing message. */
export class UserError extends Error {
  constructor(
    message: string,
    public status = 400,
  ) {
    super(message);
  }
}
