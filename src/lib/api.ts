import crypto from "crypto";
import { NextResponse } from "next/server";
import type { z } from "zod";

export function jsonError(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

/**
 * JSON for endpoints that are polled. Carries an ETag so a poller that
 * already has this exact payload gets an empty 304 instead of the whole list.
 */
export function jsonWithEtag(req: Request, data: unknown) {
  const body = JSON.stringify(data);
  const etag = `W/"${crypto.createHash("sha1").update(body).digest("base64url")}"`;
  const headers = { ETag: etag, "Cache-Control": "no-store" };
  if (req.headers.get("if-none-match") === etag) {
    return new NextResponse(null, { status: 304, headers });
  }
  return new NextResponse(body, {
    headers: { ...headers, "Content-Type": "application/json" },
  });
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
