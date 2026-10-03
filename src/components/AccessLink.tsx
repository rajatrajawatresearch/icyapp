"use client";

import { useState } from "react";
import { Copy, Link2, RefreshCw } from "lucide-react";
import { api, copyText, errorMessage } from "@/lib/client-api";
import { formatDateTime } from "@/lib/format";
import { confirmDialog } from "./ConfirmDialog";
import { btnPrimary, btnSecondary, input } from "./ui";

/**
 * Create / refresh / turn off a staff member's private sign-in link.
 * The link opens their panel without a password, so the server shows it only
 * once — right here, when it is made.
 */
export function AccessLink({
  endpoint,
  linkAt,
  who,
  onChange,
}: {
  /** POST to refresh, DELETE to turn off. */
  endpoint: string;
  /** When the current link was issued (null = no link). */
  linkAt: string | null;
  /** "your" for my own link, otherwise the person's name. */
  who: string;
  onChange?: () => void;
}) {
  const [fresh, setFresh] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const mine = who === "your";

  async function refresh() {
    if (
      linkAt &&
      !(await confirmDialog({
        title: mine ? "Make a new sign-in link?" : `Make a new sign-in link for ${who}?`,
        body: mine
          ? "Your old link stops working and your other devices are signed out."
          : "Their old link stops working and they are signed out everywhere.",
        confirm: "Make new link",
      }))
    )
      return;
    setBusy(true);
    setError(null);
    try {
      const { path } = await api<{ path: string }>(endpoint, { method: "POST" });
      setFresh(`${window.location.origin}${path}`);
      setCopied(false);
      onChange?.();
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }

  async function turnOff() {
    if (
      !(await confirmDialog({
        title: "Turn this sign-in link off?",
        body: "Signing in with a password still works.",
        confirm: "Turn off",
      }))
    )
      return;
    setBusy(true);
    setError(null);
    try {
      await api(endpoint, { method: "DELETE" });
      setFresh(null);
      onChange?.();
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        <button type="button" className={btnSecondary} onClick={refresh} disabled={busy}>
          {linkAt ? (
            <RefreshCw className="h-4 w-4" aria-hidden />
          ) : (
            <Link2 className="h-4 w-4" aria-hidden />
          )}
          {busy ? "Working…" : linkAt ? "Refresh link" : "Create sign-in link"}
        </button>
        {linkAt && (
          <button
            type="button"
            className="text-sm font-semibold text-ink-3 hover:text-danger-ink"
            onClick={turnOff}
            disabled={busy}
          >
            Turn off
          </button>
        )}
        <span className="text-xs text-ink-3">
          {linkAt ? `Link made ${formatDateTime(linkAt)}` : "No sign-in link"}
        </span>
      </div>

      {fresh && (
        <div className="rounded-xl border border-success-line bg-success-soft p-3">
          <p className="text-sm font-semibold text-success-ink">
            {mine ? "Your new sign-in link" : `New sign-in link for ${who}`}
          </p>
          <div className="mt-2 flex gap-2">
            <input
              readOnly
              className={`${input} font-mono text-xs`}
              value={fresh}
              onFocus={(e) => e.target.select()}
            />
            <button
              type="button"
              className={btnPrimary}
              onClick={async () => setCopied(await copyText(fresh))}
            >
              <Copy className="h-4 w-4" aria-hidden />
              {copied ? "Copied" : "Copy"}
            </button>
          </div>
          <p className="mt-2 text-xs text-success-ink">
            Copy it now. For safety it is not shown again, but you can make a
            new one any time.
          </p>
        </div>
      )}
      {error && <p className="text-sm text-danger-ink">{error}</p>}
    </div>
  );
}
