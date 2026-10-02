// Shrinks a photo in the browser before upload. Phone cameras produce
// 3–8 MB files: slow on mobile data, heavy for customers to load, and above
// the 4.5 MB request limit of the hosting platform.

type Options = { maxSide?: number; quality?: number };

export async function compressImage(
  file: File,
  { maxSide = 1280, quality = 0.82 }: Options = {},
): Promise<File> {
  // GIFs may be animated and unknown types can't be drawn — send as they are.
  if (!/^image\/(jpeg|png|webp)$/.test(file.type)) return file;

  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file);
  } catch {
    return file;
  }
  const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height));
  if (scale === 1 && file.size <= 300_000) {
    bitmap.close();
    return file; // already small
  }

  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  const ctx = canvas.getContext("2d");
  if (!ctx) return file;
  // JPEG has no transparency: paint white behind PNGs instead of black.
  ctx.fillStyle = "white";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();

  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, "image/jpeg", quality),
  );
  if (!blob || blob.size >= file.size) return file;
  return new File([blob], file.name.replace(/\.\w+$/, "") + ".jpg", {
    type: "image/jpeg",
  });
}
