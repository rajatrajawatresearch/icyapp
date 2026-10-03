"use client";

import { useEffect, useRef, useState } from "react";
import { btnDangerSolid, btnPrimary, btnSecondary, scrim, sheet } from "./ui";

type Ask = {
  /** The question, e.g. "Mark order #12 as paid?". */
  title: string;
  /** One short line of consequence, only when it adds something. */
  body?: string;
  /** The label of the button that goes ahead (default "Yes"). */
  confirm?: string;
  /** The label of the button that backs out (default "Cancel"). */
  cancel?: string;
  /** Red button, for things that can't be undone. */
  danger?: boolean;
};

let host: ((ask: Ask) => Promise<boolean>) | null = null;

/**
 * Asks a yes/no question inside the app and resolves with the answer. Used
 * instead of the browser's own confirm box: that one takes focus away from
 * the page, so the privacy cover came up and had to be tapped away, which
 * felt like being asked twice.
 */
export function confirmDialog(ask: Ask): Promise<boolean> {
  return host ? host(ask) : Promise.resolve(window.confirm(ask.title));
}

/** Rendered once, in the root layout. */
export function ConfirmHost() {
  const [open, setOpen] = useState<(Ask & { answer: (ok: boolean) => void }) | null>(
    null,
  );
  const yesRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    host = (ask) =>
      new Promise((answer) => setOpen({ ...ask, answer }));
    return () => {
      host = null;
    };
  }, []);

  useEffect(() => {
    if (!open) return;
    yesRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      open.answer(false);
      setOpen(null);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  if (!open) return null;
  const close = (ok: boolean) => {
    open.answer(ok);
    setOpen(null);
  };

  return (
    <div className={`${scrim} z-80`} onClick={() => close(false)}>
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="confirm-title"
        className={`${sheet} p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] sm:max-w-sm`}
        onClick={(e) => e.stopPropagation()}
      >
        <h2 id="confirm-title" className="text-lg font-extrabold tracking-tight text-ink">
          {open.title}
        </h2>
        {open.body && <p className="mt-1.5 text-sm text-ink-2">{open.body}</p>}
        <div className="mt-5 grid grid-cols-2 gap-2">
          <button type="button" className={`${btnSecondary} py-3`} onClick={() => close(false)}>
            {open.cancel ?? "Cancel"}
          </button>
          <button
            ref={yesRef}
            type="button"
            className={`${open.danger ? btnDangerSolid : btnPrimary} py-3`}
            onClick={() => close(true)}
          >
            {open.confirm ?? "Yes"}
          </button>
        </div>
      </div>
    </div>
  );
}
