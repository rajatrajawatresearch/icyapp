"use client";

import { useCallback, useEffect, useState } from "react";
import type { CustomerDTO } from "@/lib/dto";
import { api, copyText, errorMessage } from "@/lib/client-api";
import { formatDate } from "@/lib/format";
import { LINK_ORIGIN } from "@/lib/link-origin";
import { PHONE_ERROR, indianMobileDigits } from "@/lib/phone";
import { DeleteButton } from "@/components/DeleteButton";
import { RecentlyDeleted } from "@/components/RecentlyDeleted";
import {
  btnPrimary,
  btnSecondary,
  card,
  input,
  label,
  pageTitle,
} from "@/components/ui";

/** The link as it is shared: on the app's neutral address when one is set up. */
function customerLink(token: string) {
  return `${LINK_ORIGIN || window.location.origin}/u/${token}`;
}

/** Keep only what belongs in the 10-digit box, whatever was typed or pasted. */
function phoneDigits(text: string) {
  return (indianMobileDigits(text) ?? text.replace(/\D/g, "")).slice(0, 10);
}

export function CustomersClient({ isSuper }: { isSuper: boolean }) {
  const [items, setItems] = useState<CustomerDTO[] | null>(null);
  const [trash, setTrash] = useState<CustomerDTO[]>([]);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  /** Customer whose link was just generated/regenerated — shown prominently. */
  const [fresh, setFresh] = useState<CustomerDTO | null>(null);
  const [query, setQuery] = useState("");

  const load = useCallback(async () => {
    try {
      const data = await api<{ items: CustomerDTO[]; trash: CustomerDTO[] }>(
        "/api/admin/customers",
      );
      setItems(data.items);
      setTrash(data.trash);
    } catch (e) {
      setError(errorMessage(e));
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- initial data fetch
    load();
  }, [load]);

  async function copy(c: CustomerDTO) {
    if (await copyText(customerLink(c.token))) {
      setCopiedId(c.id);
      setTimeout(() => setCopiedId((id) => (id === c.id ? null : id)), 1500);
    }
  }

  async function add(e: React.FormEvent) {
    e.preventDefault();
    if (!indianMobileDigits(phone)) {
      setError(PHONE_ERROR);
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const c = await api<CustomerDTO>("/api/admin/customers", {
        method: "POST",
        json: { name, phone: `+91${phone}` },
      });
      setName("");
      setPhone("");
      setFresh(c);
      await load();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  async function regenerate(c: CustomerDTO) {
    if (
      !window.confirm(
        `Regenerate link for ${c.name}? Their old link will stop working immediately.`,
      )
    )
      return;
    try {
      const updated = await api<CustomerDTO>(
        `/api/admin/customers/${c.id}/regenerate-token`,
        { method: "POST" },
      );
      setFresh(updated);
      await load();
    } catch (err) {
      setError(errorMessage(err));
    }
  }

  async function resetDevice(c: CustomerDTO) {
    if (
      !window.confirm(
        `Let ${c.name} use their link on a new device? The link stays the same; the next device to open it becomes its only device.`,
      )
    )
      return;
    try {
      await api(`/api/admin/customers/${c.id}/reset-device`, { method: "POST" });
      await load();
    } catch (err) {
      setError(errorMessage(err));
    }
  }

  async function toggleActive(c: CustomerDTO) {
    try {
      await api(`/api/admin/customers/${c.id}`, {
        method: "PATCH",
        json: { isActive: !c.isActive },
      });
      if (fresh?.id === c.id) setFresh(null);
      await load();
    } catch (err) {
      setError(errorMessage(err));
    }
  }

  const q = query.trim().toLowerCase();
  // Numbers are stored spaced ("+91 98765 43210"), so compare digits with digits.
  const qDigits = q.replace(/\D/g, "");
  const visible = (items ?? []).filter(
    (c) =>
      !q ||
      c.name.toLowerCase().includes(q) ||
      (qDigits !== "" && c.phone.replace(/\D/g, "").includes(qDigits)),
  );

  return (
    <div>
      <h1 className={pageTitle}>Customers</h1>

      <form
        onSubmit={add}
        className={`${card} mt-4 grid gap-3 p-4 sm:grid-cols-[1fr_1fr_auto] sm:items-end`}
      >
        <div>
          <label className={label} htmlFor="c-name">
            Name
          </label>
          <input
            id="c-name"
            className={input}
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </div>
        <div>
          <label className={label} htmlFor="c-phone">
            Mobile number (India)
          </label>
          <div className="flex">
            <span className="grid shrink-0 place-items-center rounded-l-xl border border-r-0 border-line-strong bg-muted px-3 text-sm font-semibold text-ink-2">
              +91
            </span>
            <input
              id="c-phone"
              className={`${input} rounded-l-none tabular-nums`}
              required
              type="tel"
              inputMode="numeric"
              autoComplete="off"
              placeholder="10 digits"
              pattern="[6-9][0-9]{9}"
              title={PHONE_ERROR}
              maxLength={10}
              value={phone}
              onChange={(e) => setPhone(phoneDigits(e.target.value))}
              onPaste={(e) => {
                // A pasted "+91 98765 43210" is longer than the box allows.
                e.preventDefault();
                setPhone(phoneDigits(e.clipboardData.getData("text")));
              }}
            />
          </div>
        </div>
        <button
          type="submit"
          className={`${btnPrimary} py-2.5`}
          disabled={busy}
        >
          {busy ? "Adding…" : "Add & get link"}
        </button>
      </form>
      {error && <p className="mt-3 text-sm text-danger-ink">{error}</p>}

      {fresh && (
        <div className="mt-4 rounded-xl border border-success-line bg-success-soft p-4">
          <p className="text-sm font-medium text-success-ink">
            Private link for {fresh.name}. Share it on WhatsApp. It opens on the
            first device that uses it, and only there.
          </p>
          <div className="mt-2 flex gap-2">
            <input
              readOnly
              className={`${input} font-mono text-xs`}
              value={customerLink(fresh.token)}
              onFocus={(e) => e.target.select()}
            />
            <button
              type="button"
              className={btnPrimary}
              onClick={() => copy(fresh)}
            >
              {copiedId === fresh.id ? "Copied!" : "Copy"}
            </button>
          </div>
          <button
            type="button"
            className="mt-2 text-xs text-success-ink underline"
            onClick={() => setFresh(null)}
          >
            Dismiss
          </button>
        </div>
      )}

      <div className="mt-6 flex items-center justify-between gap-3">
        <p className="text-sm text-ink-2">
          {items ? `${items.length} customer${items.length === 1 ? "" : "s"}` : ""}
        </p>
        <input
          className={`${input} max-w-[14rem]`}
          placeholder="Search name or phone"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>

      <ul className="mt-3 space-y-2">
        {visible.map((c) => (
          <li key={c.id} className={`${card} p-3`}>
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="font-medium text-ink">
                  {c.name}{" "}
                  {!c.isActive && (
                    <span className="ml-1 rounded-full bg-danger-soft px-2 py-0.5 text-xs font-medium text-danger-ink">
                      Link revoked
                    </span>
                  )}
                </p>
                <p className="text-sm text-ink-2">
                  {c.phone}, {c.orderCount} order
                  {c.orderCount === 1 ? "" : "s"}
                </p>
                <p className="mt-1 truncate font-mono text-xs text-ink-4">
                  /u/{c.token}
                </p>
                <p className="mt-0.5 text-xs text-ink-3" suppressHydrationWarning>
                  {c.deviceBoundAt
                    ? `In use on one device since ${formatDate(c.deviceBoundAt)}`
                    : "Not opened on any device yet"}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                {c.isActive && (
                  <button
                    type="button"
                    className={btnSecondary}
                    onClick={() => copy(c)}
                  >
                    {copiedId === c.id ? "Copied!" : "Copy link"}
                  </button>
                )}
                {c.deviceBoundAt && (
                  <button
                    type="button"
                    className={btnSecondary}
                    onClick={() => resetDevice(c)}
                  >
                    Reset device
                  </button>
                )}
                <button
                  type="button"
                  className={btnSecondary}
                  onClick={() => regenerate(c)}
                >
                  Regenerate
                </button>
                <button
                  type="button"
                  className={btnSecondary}
                  onClick={() => toggleActive(c)}
                >
                  {c.isActive ? "Revoke" : "Restore"}
                </button>
                {isSuper && (
                  <DeleteButton
                    entity="customer"
                    id={c.id}
                    name={c.name}
                    onScheduled={load}
                  />
                )}
              </div>
            </div>
          </li>
        ))}
      </ul>
      {items && items.length === 0 && (
        <p className="mt-3 rounded-xl border border-dashed border-line-strong p-8 text-center text-sm text-ink-3">
          No customers yet. Add one above to generate their private link.
        </p>
      )}

      {isSuper && (
        <RecentlyDeleted
          entity="customer"
          rows={trash.map((c) => ({
            id: c.id,
            label: `${c.name}, ${c.phone}`,
            scheduledDeleteAt: c.scheduledDeleteAt,
          }))}
          onChange={load}
        />
      )}
    </div>
  );
}
