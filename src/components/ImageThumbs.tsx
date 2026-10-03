"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";

/** A row of small images; tapping one opens it full screen without leaving the app. */
export function ImageThumbs({
  images,
  alt,
  className = "",
}: {
  images: { id: string; url: string }[];
  /** What the images are, e.g. "Payment screenshot". */
  alt: string;
  className?: string;
}) {
  const [open, setOpen] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(null);
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <>
      <ul className={`flex flex-wrap gap-2 ${className}`}>
        {images.map((img, i) => (
          <li key={img.id}>
            <button
              type="button"
              aria-label={`${alt} ${i + 1}, open`}
              onClick={(e) => {
                e.stopPropagation();
                setOpen(img.url);
              }}
              className="block overflow-hidden rounded-lg border border-line bg-muted transition active:scale-[0.96]"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={img.url}
                alt=""
                loading="lazy"
                decoding="async"
                className="h-16 w-16 object-cover"
              />
            </button>
          </li>
        ))}
      </ul>
      {open &&
        createPortal(
          <div
            role="dialog"
            aria-modal="true"
            aria-label={alt}
            className="fixed inset-0 z-70 flex animate-fade items-center justify-center bg-scrim p-4 pt-16 backdrop-blur-sm"
            onClick={() => setOpen(null)}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={open}
              alt={alt}
              className="max-h-full min-h-0 max-w-full rounded-xl object-contain shadow-pop"
            />
            {/* Pinned to the corner, so it can't use the shared icon button (that one is position: relative). */}
            <button
              type="button"
              aria-label="Close"
              className="absolute top-3 right-3 grid h-10 w-10 place-items-center rounded-xl border border-line bg-surface text-ink shadow-pop transition active:scale-[0.96]"
              onClick={() => setOpen(null)}
            >
              <X className="h-5 w-5" aria-hidden />
            </button>
          </div>,
          document.body,
        )}
    </>
  );
}
