"use client";

import { useCallback, useEffect, useState } from "react";
import type { CustomerDTO } from "@/lib/dto";
import { api, copyText, errorMessage } from "@/lib/client-api";
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

function customerLink(token: string) {
  return `${window.location.origin}/u/${token}`;
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
    setBusy(true);
    setError(null);
    try {
      const c = await api<CustomerDTO>("/api/admin/customers", {
        method: "POST",
        json: { name, phone },
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
  const visible = (items ?? []).filter(
    (c) => !q || c.name.toLowerCase().includes(q) || c.phone.includes(q),
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
            Phone
          </label>
          <input
            id="c-phone"
            className={input}
            required
            type="tel"
            inputMode="tel"
            placeholder="98765 43210"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
          />
        </div>
        <button
          type="submit"
          className={`${btnPrimary} py-2.5`}
          disabled={busy}
        >
          {busy ? "Adding…" : "Add & get link"}
        </button>
      </form>
      {error && <p className="mt-3 text-sm text-red-600">{error}</p>}

      {fresh && (
        <div className="mt-4 rounded-xl border border-emerald-300 bg-emerald-50 p-4">
          <p className="text-sm font-medium text-emerald-900">
            Private link for {fresh.name} — share it on WhatsApp
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
            className="mt-2 text-xs text-emerald-800 underline"
            onClick={() => setFresh(null)}
          >
            Dismiss
          </button>
        </div>
      )}

      <div className="mt-6 flex items-center justify-between gap-3">
        <p className="text-sm text-gray-600">
          {items ? `${items.length} customers` : "Loading…"}
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
                <p className="font-medium text-gray-900">
                  {c.name}{" "}
                  {!c.isActive && (
                    <span className="ml-1 rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700">
                      Link revoked
                    </span>
                  )}
                </p>
                <p className="text-sm text-gray-600">
                  {c.phone} · {c.orderCount} order
                  {c.orderCount === 1 ? "" : "s"}
                </p>
                <p className="mt-1 truncate font-mono text-xs text-gray-400">
                  /u/{c.token}
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
        <p className="mt-3 rounded-xl border border-dashed border-gray-300 p-8 text-center text-sm text-gray-500">
          No customers yet. Add one above to generate their private link.
        </p>
      )}

      {isSuper && (
        <RecentlyDeleted
          entity="customer"
          rows={trash.map((c) => ({
            id: c.id,
            label: `${c.name} · ${c.phone}`,
            scheduledDeleteAt: c.scheduledDeleteAt,
          }))}
          onChange={load}
        />
      )}
    </div>
  );
}
