"use client";

import { useCallback, useEffect, useState } from "react";
import type { AdminDTO } from "@/lib/dto";
import { api, errorMessage } from "@/lib/client-api";
import { formatDateTime } from "@/lib/format";
import {
  btnPrimary,
  btnSecondary,
  card,
  input,
  label,
  pageTitle,
} from "@/components/ui";

const EMPTY = {
  name: "",
  email: "",
  password: "",
  role: "ADMIN" as AdminDTO["role"],
};

export function AdminsClient({ myId }: { myId: string }) {
  const [items, setItems] = useState<AdminDTO[] | null>(null);
  const [form, setForm] = useState(EMPTY);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setItems(
        (await api<{ items: AdminDTO[] }>("/api/superadmin/admins")).items,
      );
    } catch (e) {
      setError(errorMessage(e));
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- initial data fetch
    load();
  }, [load]);

  async function create(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await api("/api/superadmin/admins", { method: "POST", json: form });
      setForm(EMPTY);
      await load();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  async function toggle(a: AdminDTO) {
    if (
      a.isActive &&
      !window.confirm(
        `Deactivate ${a.email}? They will be signed out and unable to log in.`,
      )
    )
      return;
    try {
      await api(`/api/superadmin/admins/${a.id}`, {
        method: "PATCH",
        json: { isActive: !a.isActive },
      });
      await load();
    } catch (err) {
      setError(errorMessage(err));
    }
  }

  return (
    <div>
      <h1 className={pageTitle}>Team accounts</h1>

      <form
        onSubmit={create}
        className={`${card} mt-4 grid gap-3 p-4 sm:grid-cols-2`}
      >
        <div>
          <label className={label} htmlFor="a-name">
            Name
          </label>
          <input
            id="a-name"
            className={input}
            required
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
          />
        </div>
        <div>
          <label className={label} htmlFor="a-email">
            Email
          </label>
          <input
            id="a-email"
            type="email"
            className={input}
            required
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
          />
        </div>
        <div>
          <label className={label} htmlFor="a-pass">
            Temporary password (min 8)
          </label>
          <input
            id="a-pass"
            type="text"
            autoComplete="off"
            className={input}
            required
            minLength={8}
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
          />
        </div>
        <div>
          <label className={label} htmlFor="a-role">
            Role
          </label>
          <select
            id="a-role"
            className={input}
            value={form.role}
            onChange={(e) =>
              setForm({ ...form, role: e.target.value as AdminDTO["role"] })
            }
          >
            <option value="ADMIN">Admin</option>
            <option value="SUPER_ADMIN">Super admin</option>
            <option value="DELIVERY">Delivery partner</option>
          </select>
        </div>
        {error && <p className="text-sm text-red-600 sm:col-span-2">{error}</p>}
        <div className="sm:col-span-2 sm:flex sm:justify-end">
          <button
            type="submit"
            className={`${btnPrimary} w-full sm:w-auto`}
            disabled={busy}
          >
            {busy ? "Creating…" : "Create admin"}
          </button>
        </div>
      </form>

      <ul className="mt-6 space-y-2">
        {(items ?? []).map((a) => (
          <li
            key={a.id}
            className={`${card} flex flex-wrap items-center justify-between gap-3 p-3 ${a.isActive ? "" : "opacity-60"}`}
          >
            <div className="min-w-0">
              <p className="font-medium text-gray-900">
                {a.name}
                {a.id === myId && (
                  <span className="ml-1 text-xs text-gray-500">(you)</span>
                )}
              </p>
              <p className="truncate text-sm text-gray-600">{a.email}</p>
              <p className="text-xs text-gray-500">
                {a.role === "SUPER_ADMIN" ? "Super admin" : a.role === "DELIVERY" ? "🛵 Delivery partner" : "Admin"} · added{" "}
                {formatDateTime(a.createdAt)}
                {!a.isActive && " · Deactivated"}
              </p>
            </div>
            {a.id !== myId && (
              <button
                type="button"
                className={btnSecondary}
                onClick={() => toggle(a)}
              >
                {a.isActive ? "Deactivate" : "Reactivate"}
              </button>
            )}
          </li>
        ))}
      </ul>
      {items === null && <p className="mt-6 text-sm text-gray-500">Loading…</p>}
    </div>
  );
}
