import { readFile } from "fs/promises";
import path from "path";
import { MIME_BY_EXT, UPLOAD_DIR, UPLOAD_NAME_RE } from "@/lib/uploads";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ name: string }> },
) {
  const { name } = await params;
  if (!UPLOAD_NAME_RE.test(name))
    return new Response("Not found", { status: 404 });
  try {
    const buf = await readFile(path.join(UPLOAD_DIR, name));
    const ext = name.split(".").pop()!;
    return new Response(new Uint8Array(buf), {
      headers: {
        "Content-Type": MIME_BY_EXT[ext] ?? "application/octet-stream",
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  } catch {
    return new Response("Not found", { status: 404 });
  }
}
