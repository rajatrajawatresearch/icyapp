"use client";

import { useState } from "react";
import { Trash2 } from "lucide-react";
import { api, errorMessage } from "@/lib/client-api";
import { confirmDialog } from "./ConfirmDialog";
import { btnDanger, btnDangerSolid, btnSecondary, card, input, label } from "./ui";

const EMPTY = { currentPassword: "", name: "", email: "", password: "" };

/**
 * A super admin deleting their own account, the original one included. The
 * store must always have an owner: if another super admin exists the account
 * is simply deleted; otherwise the account that takes its place is made in
 * the same step, and this device carries on signed in as the new one.
 */
export function ReplaceAccount({
  email,
  hasOtherSuper,
}: {
  email: string;
  /** Another active super admin exists, so no replacement is needed. */
  hasOtherSuper: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(EMPTY);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const set = (field: keyof typeof EMPTY) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm({ ...form, [field]: e.target.value });

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (
      !(await confirmDialog({
        title: "Delete this account?",
        body: hasOtherSuper
          ? `${email} is deleted now and can't be brought back. You are signed out.`
          : `${email} is deleted now and can't be brought back. You carry on as ${form.email.trim()}.`,
        confirm: "Delete",
        danger: true,
      }))
    )
      return;
    setBusy(true);
    setError(null);
    try {
      const { signedOut } = await api<{ signedOut: boolean }>(
        "/api/superadmin/replace-account",
        {
          method: "POST",
          json: {
            currentPassword: form.currentPassword,
            replacement: hasOtherSuper
              ? undefined
              : { name: form.name, email: form.email, password: form.password },
          },
        },
      );
      // A full reload on purpose: every screen now belongs to someone else.
      window.location.href = signedOut ? "/admin/login" : "/admin/account";
    } catch (err) {
      setError(errorMessage(err));
      setBusy(false);
    }
  }

  return (
    <section id="replace" className={`${card} mt-4 scroll-mt-24 space-y-3 p-4`}>
      <div>
        <h2 className="font-bold text-ink">Delete this account</h2>
        <p className="mt-0.5 text-sm text-ink-3">
          {hasOtherSuper
            ? "Another super admin exists, so this account can simply be deleted."
            : "You are the only super admin. Make the account that takes your place; this one is deleted in the same step."}
        </p>
      </div>
      {!open ? (
        <button type="button" className={btnDanger} onClick={() => setOpen(true)}>
          <Trash2 className="h-4 w-4" aria-hidden />
          Delete my account
        </button>
      ) : (
        <form onSubmit={submit} className="space-y-3">
          <div>
            <label className={label} htmlFor="rep-current">
              Your current password
            </label>
            <input
              id="rep-current"
              type="password"
              autoComplete="current-password"
              required
              className={input}
              value={form.currentPassword}
              onChange={set("currentPassword")}
            />
          </div>
          {!hasOtherSuper && (
            <>
              <p className="pt-1 text-sm font-bold text-ink">The new super admin</p>
              <div>
                <label className={label} htmlFor="rep-name">
                  Name
                </label>
                <input
                  id="rep-name"
                  required
                  autoComplete="off"
                  className={input}
                  value={form.name}
                  onChange={set("name")}
                />
              </div>
              <div>
                <label className={label} htmlFor="rep-email">
                  Email
                </label>
                <input
                  id="rep-email"
                  type="email"
                  required
                  autoComplete="off"
                  autoCapitalize="none"
                  className={input}
                  value={form.email}
                  onChange={set("email")}
                />
              </div>
              <div>
                <label className={label} htmlFor="rep-pass">
                  Password (8 or more characters)
                </label>
                <input
                  id="rep-pass"
                  type="password"
                  required
                  minLength={8}
                  autoComplete="new-password"
                  className={input}
                  value={form.password}
                  onChange={set("password")}
                />
              </div>
            </>
          )}
          {error && <p className="text-sm text-danger-ink">{error}</p>}
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              className={btnSecondary}
              disabled={busy}
              onClick={() => {
                setOpen(false);
                setForm(EMPTY);
                setError(null);
              }}
            >
              Keep my account
            </button>
            <button type="submit" className={btnDangerSolid} disabled={busy}>
              {busy ? "Working…" : "Delete my account"}
            </button>
          </div>
        </form>
      )}
    </section>
  );
}
