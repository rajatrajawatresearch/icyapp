"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { LockKeyhole, Smartphone } from "lucide-react";
import { Logo } from "@/components/Logo";
import { ThemePicker } from "@/components/ThemePicker";
import { api, errorMessage } from "@/lib/client-api";
import { APP_NAME } from "@/lib/brand";
import { btnPrimary } from "@/components/ui";

/**
 * Shown instead of the shop when this device doesn't own the link yet:
 * - "unclaimed": nobody has opened the link. One tap makes this device its
 *   only device. It is a tap, not automatic, so the customer knows before
 *   it happens and a link preview can't take the link by accident.
 * - "locked": the link already belongs to another device.
 */
export function DeviceGate({
  token,
  state,
}: {
  token: string;
  state: "unclaimed" | "locked";
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function claim() {
    setBusy(true);
    setError(null);
    try {
      await api(`/api/customer/${token}/device`, { method: "POST" });
      router.refresh();
    } catch (e) {
      setError(errorMessage(e));
      setBusy(false);
      // Someone else got there first: show the locked screen.
      if ((e as { status?: number }).status === 423) router.refresh();
    }
  }

  const locked = state === "locked";
  const Icon = locked ? LockKeyhole : Smartphone;
  return (
    <main className="mx-auto flex w-full max-w-sm flex-1 flex-col items-center justify-center px-6 py-16 text-center">
      <div className="absolute top-3 right-3">
        <ThemePicker />
      </div>
      {locked ? (
        <span className="grid h-16 w-16 place-items-center rounded-2xl bg-muted text-ink-3">
          <Icon className="h-7 w-7" aria-hidden />
        </span>
      ) : (
        <Logo className="h-16 w-16" />
      )}
      <h1 className="mt-5 text-2xl font-extrabold tracking-tight text-ink">
        {locked ? "This link is in use on another device" : `Welcome to ${APP_NAME}`}
      </h1>
      <p className="mt-2 text-sm text-ink-2">
        {locked
          ? "For your safety, your private link opens on one device only. If you changed your phone or browser, ask the store to reset it for you."
          : "This is your private link to the store. It will work on this device only, so open it on the phone you will order from."}
      </p>
      {!locked && (
        <button
          type="button"
          className={`${btnPrimary} mt-6 w-full py-3.5 text-base`}
          onClick={claim}
          disabled={busy}
        >
          <Icon className="h-5 w-5" aria-hidden />
          {busy ? "Opening…" : "Use this device and open the shop"}
        </button>
      )}
      {error && <p className="mt-3 text-sm text-danger-ink">{error}</p>}
      <p className="mt-5 text-xs text-ink-3">
        {locked ? "See the " : "By continuing you agree to the "}
        <a href="/terms" target="_blank" rel="noreferrer" className="font-semibold underline">
          terms and conditions
        </a>
        .
      </p>
    </main>
  );
}
