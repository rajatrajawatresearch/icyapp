"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Eye, EyeOff } from "lucide-react";
import { api, errorMessage } from "@/lib/client-api";
import { btnPrimary, input, label } from "@/components/ui";

export function LoginForm({ linkInvalid }: { linkInvalid: boolean }) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const { role } = await api<{ role: string }>("/api/auth/login", {
        method: "POST",
        json: { email, password },
      });
      router.replace(role === "DELIVERY" ? "/delivery" : "/admin/orders");
      router.refresh();
    } catch (err) {
      setError(errorMessage(err));
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="mt-7 space-y-4">
      {linkInvalid && !error && (
        <p className="rounded-xl border border-warning-line bg-warning-soft p-3 text-sm text-warning-ink">
          That sign-in link no longer works. Ask the store owner for a new one,
          or sign in with your email and password.
        </p>
      )}
      <div>
        <label className={label} htmlFor="email">
          Email
        </label>
        <input
          id="email"
          type="email"
          inputMode="email"
          autoComplete="email"
          autoCapitalize="none"
          required
          className={`${input} py-3`}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
      </div>
      <div>
        <label className={label} htmlFor="password">
          Password
        </label>
        <div className="relative">
          <input
            id="password"
            type={show ? "text" : "password"}
            autoComplete="current-password"
            required
            className={`${input} py-3 pr-12`}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <button
            type="button"
            aria-label={show ? "Hide password" : "Show password"}
            aria-pressed={show}
            onClick={() => setShow((s) => !s)}
            className="absolute inset-y-0 right-0 grid w-12 place-items-center rounded-r-xl text-ink-3 hover:text-ink"
          >
            {show ? (
              <EyeOff className="h-5 w-5" aria-hidden />
            ) : (
              <Eye className="h-5 w-5" aria-hidden />
            )}
          </button>
        </div>
      </div>
      {error && (
        <p role="alert" className="rounded-xl bg-danger-soft p-3 text-sm text-danger-ink">
          {error}
        </p>
      )}
      <button type="submit" className={`${btnPrimary} w-full py-3.5 text-base`} disabled={busy}>
        {busy ? "Signing in…" : "Sign in"}
      </button>
      <p className="text-center text-sm text-ink-3">
        Got a sign-in link from the store? Just open it.
      </p>
    </form>
  );
}
