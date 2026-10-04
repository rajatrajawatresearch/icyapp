"use client";

import { useState } from "react";
import { Ellipsis } from "lucide-react";
import { btnSecondary } from "./ui";

/**
 * Keeps a card light: the one or two things people do every time stay on
 * show, everything else waits behind this button. Put it in a wrapping row;
 * the opened panel takes the next line.
 */
export function More({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        aria-expanded={open}
        className={btnSecondary}
        onClick={() => setOpen(!open)}
      >
        <Ellipsis className="h-4 w-4" aria-hidden />
        More
      </button>
      {open && (
        <div className="flex w-full flex-wrap items-end gap-2 rounded-xl bg-subtle p-2.5">
          {children}
        </div>
      )}
    </>
  );
}
