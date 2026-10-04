"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Copy } from "lucide-react";
import type { AdminDTO } from "@/lib/dto";
import { api, copyText, errorMessage } from "@/lib/client-api";
import { formatDateTime } from "@/lib/format";
import { LINK_ORIGIN } from "@/lib/link-origin";
import { MODULES, type ModuleId } from "@/lib/modules";
import { AccessLink } from "@/components/AccessLink";
import { confirmDialog } from "@/components/ConfirmDialog";
import { DeleteButton } from "@/components/DeleteButton";
import { RecentlyDeleted } from "@/components/RecentlyDeleted";
import { ListSkeleton } from "@/components/Skeleton";
import {
  btnDanger,
  btnPrimary,
  btnSecondary,
  card,
  emptyState,
  input,
  label,
  pageLead,
  pageTitle,
  pill,
} from "@/components/ui";

const ROLE_LABEL: Record<AdminDTO["role"], string> = {
  SUPER_ADMIN: "Super admin",
  ADMIN: "Admin",
  DELIVERY: "Delivery partner",
};

const EMPTY = {
  name: "",
  email: "",
  password: "",
  role: "ADMIN" as AdminDTO["role"],
};

/**
 * Staff accounts and their sign-in links.
 * - scope "all" (super admin): every account; can add and deactivate people.
 * - scope "riders" (admins too): delivery partners only; can refresh their links.
 */
export function TeamClient({
  myId,
  scope,
}: {
  myId: string;
  scope: "all" | "riders";
}) {
  const manage = scope === "all";
  const [items, setItems] = useState<AdminDTO[] | null>(null);
  const [form, setForm] = useState(EMPTY);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  /** Accounts waiting to be deleted: still undoable. */
  const [trash, setTrash] = useState<AdminDTO[]>([]);

  const load = useCallback(async () => {
    try {
      const { items, trash } = await api<{ items: AdminDTO[]; trash: AdminDTO[] }>(
        "/api/admin/team",
      );
      setItems(manage ? items : items.filter((a) => a.role === "DELIVERY"));
      setTrash(manage ? trash : []);
    } catch (e) {
      setError(errorMessage(e));
    }
  }, [manage]);

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

  /** Switch one section on or off for an admin; it applies on their next tap. */
  async function setModule(a: AdminDTO, id: ModuleId) {
    const modules = a.modules.includes(id)
      ? a.modules.filter((m) => m !== id)
      : [...a.modules, id];
    setItems((prev) => prev?.map((x) => (x.id === a.id ? { ...x, modules } : x)) ?? null);
    try {
      await api(`/api/superadmin/admins/${a.id}`, { method: "PATCH", json: { modules } });
    } catch (err) {
      setError(errorMessage(err));
      await load();
    }
  }

  async function toggle(a: AdminDTO) {
    if (
      a.isActive &&
      !(await confirmDialog({
        title: `Deactivate ${a.name}?`,
        body: "They are signed out and can't sign in until you reactivate them.",
        confirm: "Deactivate",
        danger: true,
      }))
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
      <h1 className={pageTitle}>{manage ? "Team" : "Delivery team"}</h1>
      <p className={pageLead}>
        {manage
          ? "Everyone who can sign in. Give each person their own sign-in link, or an email and password."
          : "Your delivery partners. Send each one their own sign-in link; refresh it if a phone is lost."}
      </p>

      {manage && (
        <>
          <div className={`${card} mt-5 flex flex-wrap items-center justify-between gap-3 p-4`}>
            <div className="min-w-0">
              <p className="text-sm font-bold text-ink">Staff sign-in page</p>
              <p className="truncate font-mono text-xs text-ink-3">/admin/login</p>
            </div>
            <button
              type="button"
              className={btnSecondary}
              onClick={async () => {
                setCopied(
                  await copyText(`${LINK_ORIGIN || window.location.origin}/admin/login`),
                );
                setTimeout(() => setCopied(false), 1500);
              }}
            >
              <Copy className="h-4 w-4" aria-hidden />
              {copied ? "Copied" : "Copy address"}
            </button>
          </div>

          <form onSubmit={create} className={`${card} mt-4 grid gap-3 p-4 sm:grid-cols-2`}>
            <h2 className="font-bold text-ink sm:col-span-2">Add a person</h2>
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
                Starting password (8 or more characters)
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
                <option value="ADMIN">Admin (runs the store)</option>
                <option value="DELIVERY">Delivery partner (delivers orders)</option>
                <option value="SUPER_ADMIN">Super admin (owner)</option>
              </select>
            </div>
            <div className="sm:col-span-2 sm:flex sm:justify-end">
              <button type="submit" className={`${btnPrimary} w-full sm:w-auto`} disabled={busy}>
                {busy ? "Adding…" : "Add person"}
              </button>
            </div>
          </form>
        </>
      )}

      {error && <p className="mt-3 text-sm text-danger-ink">{error}</p>}

      {items === null ? (
        <ListSkeleton rows={3} className="h-28" />
      ) : items.length === 0 ? (
        <p className={`${emptyState} mt-5`}>
          No delivery partners yet. The store owner adds them under Team.
        </p>
      ) : (
        <ul className="mt-5 space-y-3">
          {items.map((a) => (
            <li key={a.id} className={`${card} space-y-3 p-4 ${a.isActive ? "" : "opacity-60"}`}>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-bold text-ink">
                    {a.name}
                    {a.id === myId && (
                      <span className="ml-1.5 text-xs font-medium text-ink-3">(you)</span>
                    )}
                  </p>
                  <p className="truncate text-sm text-ink-2">{a.email}</p>
                  <p className="mt-1 flex flex-wrap items-center gap-2 text-xs text-ink-3">
                    <span
                      className={`${pill} ${
                        a.role === "DELIVERY"
                          ? "bg-info-soft text-info-ink"
                          : a.role === "SUPER_ADMIN"
                            ? "bg-brand-100 text-brand-800"
                            : "bg-muted text-ink-2"
                      }`}
                    >
                      {ROLE_LABEL[a.role]}
                    </span>
                    {a.isActive ? `Added ${formatDateTime(a.createdAt)}` : "Deactivated"}
                  </p>
                </div>
                {manage && a.id === myId && (
                  // Your own account goes only by putting another in its place.
                  <Link href="/admin/account#replace" className={btnDanger}>
                    Delete my account
                  </Link>
                )}
                {manage && a.id !== myId && (
                  <div className="flex flex-wrap gap-2">
                    <button type="button" className={btnSecondary} onClick={() => toggle(a)}>
                      {a.isActive ? "Deactivate" : "Reactivate"}
                    </button>
                    <DeleteButton
                      entity="account"
                      id={a.id}
                      name={`${a.name} (${ROLE_LABEL[a.role]})`}
                      onScheduled={load}
                    />
                  </div>
                )}
              </div>
              {manage && a.role === "ADMIN" && (
                <div>
                  <p className="text-xs font-semibold text-ink-3">Can use</p>
                  <div className="mt-1.5 flex flex-wrap gap-1.5">
                    {MODULES.map((m) => {
                      const on = a.modules.includes(m.id);
                      return (
                        <button
                          key={m.id}
                          type="button"
                          aria-pressed={on}
                          onClick={() => setModule(a, m.id)}
                          className={`rounded-full border px-3 py-1 text-sm font-semibold transition ${
                            on
                              ? "border-brand-600 bg-brand-600 text-on-solid"
                              : "border-line-strong bg-surface text-ink-3"
                          }`}
                        >
                          {m.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
              {a.isActive && (
                <AccessLink
                  endpoint={`/api/admin/team/${a.id}/access-link`}
                  linkAt={a.accessLinkAt}
                  who={a.id === myId ? "your" : a.name}
                  onChange={load}
                />
              )}
            </li>
          ))}
        </ul>
      )}

      {manage && (
        <RecentlyDeleted
          entity="account"
          rows={trash.map((a) => ({
            id: a.id,
            label: `${a.name}, ${ROLE_LABEL[a.role]}, ${a.email}`,
            scheduledDeleteAt: a.scheduledDeleteAt,
          }))}
          onChange={load}
        />
      )}
    </div>
  );
}
