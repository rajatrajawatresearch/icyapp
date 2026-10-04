"use client";

import { useState } from "react";
import { LINK_CLOSE_CHOICES } from "@/lib/constants";
import { api, errorMessage } from "@/lib/client-api";
import { btnPrimary, card, input, label } from "@/components/ui";

const NEVER = "never";
const toOption = (sec: number | null) => (sec === null ? NEVER : String(sec));

/** How long a customer's link stays open once their order is finished. */
export function LinkSettings({ initial }: { initial: number | null }) {
  const [value, setValue] = useState(toOption(initial));
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(
    null,
  );
  const closeAfterSec = value === NEVER ? null : Number(value);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMessage(null);
    try {
      await api("/api/superadmin/settings/link", {
        method: "PUT",
        json: { closeAfterSec },
      });
      setMessage({
        ok: true,
        text: "Saved. It applies to orders finished from now on.",
      });
    } catch (err) {
      setMessage({ ok: false, text: errorMessage(err) });
    } finally {
      setBusy(false);
    }
  }

  const summary =
    closeAfterSec === null
      ? "Links stay open."
      : "The link stops working after the order is done. Reopen it from Customers.";

  return (
    <form onSubmit={save} className={`${card} mt-4 space-y-4 p-4`}>
      <div>
        <h2 className="font-bold text-ink">Close the customer&apos;s link</h2>
      </div>
      <div>
        <label className={label} htmlFor="link-close">
          Close the link
        </label>
        <select
          id="link-close"
          className={input}
          value={value}
          onChange={(e) => setValue(e.target.value)}
        >
          {/* A value set some other way still shows as what it is. */}
          {!LINK_CLOSE_CHOICES.some((c) => toOption(c.value) === value) && (
            <option value={value}>After {value} seconds</option>
          )}
          {LINK_CLOSE_CHOICES.map((c) => (
            <option key={toOption(c.value)} value={toOption(c.value)}>
              {c.label}
            </option>
          ))}
        </select>
      </div>
      <p className="rounded-xl bg-subtle p-3 text-sm text-ink-2">{summary}</p>
      {message && (
        <p className={`text-sm ${message.ok ? "text-success-ink" : "text-danger-ink"}`}>
          {message.text}
        </p>
      )}
      <button type="submit" className={`${btnPrimary} w-full py-3`} disabled={busy}>
        {busy ? "Saving…" : "Save"}
      </button>
    </form>
  );
}
