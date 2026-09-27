import { mkdir, writeFile } from "fs/promises";
import path from "path";
import crypto from "crypto";
import { put } from "@vercel/blob";
import { UserError } from "./api";

// Vercel Blob when a store is connected (production), local disk otherwise (dev).
const useBlob = Boolean(
  process.env.BLOB_READ_WRITE_TOKEN || process.env.BLOB_STORE_ID,
);

export const UPLOAD_DIR = path.join(process.cwd(), "public", "uploads");
const MAX_UPLOAD_BYTES = 5 * 1024 * 1024;

const EXT_BY_MIME: Record<string, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/webp": "webp",
  "image/gif": "gif",
};

export const MIME_BY_EXT: Record<string, string> = Object.fromEntries(
  Object.entries(EXT_BY_MIME).map(([mime, ext]) => [ext, mime]),
);

/** Matches names produced by saveImage — also guards the file route against path traversal. */
export const UPLOAD_NAME_RE = /^[a-f0-9]{24}\.(png|jpg|webp|gif)$/;

/**
 * Saves an uploaded image and returns its public URL. On Vercel the
 * filesystem is read-only, so files go to Blob. Locally they are written to
 * public/uploads and served via /api/files/<name>, because `next start` only
 * serves /public files that existed at build time.
 */
export async function saveImage(file: File): Promise<string> {
  const ext = EXT_BY_MIME[file.type];
  if (!ext)
    throw new UserError("Only PNG, JPEG, WEBP or GIF images are allowed");
  if (file.size > MAX_UPLOAD_BYTES)
    throw new UserError("Image must be 5 MB or smaller");
  const name = `${crypto.randomBytes(12).toString("hex")}.${ext}`;
  if (useBlob) {
    const blob = await put(`uploads/${name}`, file, {
      access: "public",
      contentType: file.type,
    });
    return blob.url;
  }
  await mkdir(UPLOAD_DIR, { recursive: true });
  await writeFile(
    path.join(UPLOAD_DIR, name),
    Buffer.from(await file.arrayBuffer()),
  );
  return `/api/files/${name}`;
}
