"use client";

import { useState } from "react";
import { api, errorMessage } from "@/lib/client-api";
import { btnPrimary, card, input, label } from "@/components/ui";

export function ChangePasswordForm() {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(
    null,
  );

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (newPassword !== confirm) {
      setMessage({ ok: false, text: "New passwords don't match" });
      return;
    }
    setBusy(true);
    setMessage(null);
    try {
      await api("/api/auth/password", {
        method: "POST",
        json: { currentPassword, newPassword },
      });
      setCurrentPassword("");
      setNewPassword("");
      setConfirm("");
      setMessage({ ok: true, text: "Password changed" });
    } catch (err) {
      setMessage({ ok: false, text: errorMessage(err) });
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className={`${card} mt-4 space-y-3 p-4`}>
      <h2 className="font-medium text-gray-900">Change password</h2>
      <div>
        <label className={label} htmlFor="cur-pass">
          Current password
        </label>
        <input
          id="cur-pass"
          type="password"
          autoComplete="current-password"
          required
          className={input}
          value={currentPassword}
          onChange={(e) => setCurrentPassword(e.target.value)}
        />
      </div>
      <div>
        <label className={label} htmlFor="new-pass">
          New password (min 8)
        </label>
        <input
          id="new-pass"
          type="password"
          autoComplete="new-password"
          required
          minLength={8}
          className={input}
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
        />
      </div>
      <div>
        <label className={label} htmlFor="confirm-pass">
          Confirm new password
        </label>
        <input
          id="confirm-pass"
          type="password"
          autoComplete="new-password"
          required
          minLength={8}
          className={input}
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
        />
      </div>
      {message && (
        <p
          className={`text-sm ${message.ok ? "text-emerald-700" : "text-red-600"}`}
        >
          {message.text}
        </p>
      )}
      <button type="submit" className={`${btnPrimary} w-full`} disabled={busy}>
        {busy ? "Saving…" : "Change password"}
      </button>
    </form>
  );
}
