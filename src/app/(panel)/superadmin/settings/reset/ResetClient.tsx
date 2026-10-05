"use client";

import { useEffect, useState } from "react";
import { Check } from "lucide-react";
import {
  DEFAULT_DELETE_DELAY_SECONDS,
  DELETE_DELAY_SECONDS,
  delayLabel,
  type ResetEntity,
} from "@/lib/constants";
import { api, errorMessage } from "@/lib/client-api";
import { countdown } from "@/lib/format";
import { useNow } from "@/components/useNow";
import { btnSecondary, card, field, input, label } from "@/components/ui";

type Unit = "seconds" | "minutes" | "hours" | "days";
type Range = { amount: number; unit: Unit } | null;
type Counts = Record<ResetEntity, number>;
type Ids = Record<ResetEntity, string[]>;

const PRESETS: { label: string; range: Range }[] = [
  { label: "Last 30 seconds", range: { amount: 30, unit: "seconds" } },
  { label: "Last 1 minute", range: { amount: 1, unit: "minutes" } },
  { label: "Last 2 minutes", range: { amount: 2, unit: "minutes" } },
  { label: "Last 5 minutes", range: { amount: 5, unit: "minutes" } },
  { label: "Last 10 minutes", range: { amount: 10, unit: "minutes" } },
  { label: "Last 30 minutes", range: { amount: 30, unit: "minutes" } },
  { label: "Last 1 hour", range: { amount: 1, unit: "hours" } },
  { label: "Last 6 hours", range: { amount: 6, unit: "hours" } },
  { label: "Last 24 hours", range: { amount: 24, unit: "hours" } },
  { label: "Last 7 days", range: { amount: 7, unit: "days" } },
  { label: "All time", range: null },
];
/** The preset the screen opens on: the last 5 minutes. */
const DEFAULT_PRESET = 3;

const ENTITIES: { id: ResetEntity; label: string }[] = [
  { id: "order", label: "Orders" },
  { id: "customer", label: "Customers" },
  { id: "product", label: "Products" },
  { id: "account", label: "Team accounts" },
  { id: "audit", label: "Audit log" },
  { id: "notification", label: "Notifications" },
  { id: "settings", label: "Default QR / UPI / bank details" },
];

/** "3 orders, 1 customer": only what was actually touched. */
const summary = (counts: Counts) =>
  ENTITIES.filter((e) => counts[e.id] > 0)
    .map((e) => `${counts[e.id]} ${e.label.toLowerCase()}`)
    .join(", ");

export function ResetClient() {
  const [entities, setEntities] = useState<ResetEntity[]>([
    "order",
    "customer",
  ]);
  const [preset, setPreset] = useState<number | "custom">(DEFAULT_PRESET);
  const [custom, setCustom] = useState<{ amount: string; unit: Unit }>({
    amount: "30",
    unit: "minutes",
  });
  /** Seconds until the rows are deleted for good. */
  const [delay, setDelay] = useState<number>(DEFAULT_DELETE_DELAY_SECONDS);
  const [confirm, setConfirm] = useState("");
  const [counts, setCounts] = useState<Counts | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<{
    ids: Ids;
    at: string;
    counts: Counts;
  } | null>(null);
  const now = useNow();

  const customAmount = Math.floor(Number(custom.amount));
  // undefined = invalid custom amount (disables reset + preview)
  const range: Range | undefined =
    preset === "custom"
      ? customAmount >= 1
        ? { amount: customAmount, unit: custom.unit }
        : undefined
      : PRESETS[preset].range;
  const rangeKey = JSON.stringify(range ?? "invalid");

  // Live preview of how many rows the filter matches.
  useEffect(() => {
    if (!entities.length || range === undefined) return;
    const t = setTimeout(async () => {
      try {
        const d = await api<{ counts: Counts }>("/api/superadmin/reset", {
          method: "POST",
          json: { entities, range, dryRun: true },
        });
        setCounts(d.counts);
      } catch (e) {
        setError(errorMessage(e));
      }
    }, 300);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- rangeKey captures range
  }, [entities, rangeKey]);

  const total = counts ? entities.reduce((s, e) => s + counts[e], 0) : 0;

  async function reset() {
    setBusy(true);
    setError(null);
    try {
      const d = await api<{
        ids: Ids;
        scheduledDeleteAt: string;
        counts: Counts;
      }>("/api/superadmin/reset", {
        method: "POST",
        json: { entities, range, delaySeconds: delay, confirm },
      });
      setDone({ ids: d.ids, at: d.scheduledDeleteAt, counts: d.counts });
      setConfirm("");
      setCounts(null);
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }

  async function undo() {
    if (!done) return;
    setBusy(true);
    setError(null);
    try {
      await api("/api/superadmin/reset", {
        method: "DELETE",
        json: { ids: done.ids },
      });
      setDone(null);
      setEntities((e) => [...e]); // refresh preview
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }

  const chip = (active: boolean) =>
    `rounded-full border px-3 py-1.5 text-sm font-medium transition ${
      active
        ? "border-brand-600 bg-brand-600 text-on-solid"
        : "border-line-strong bg-surface text-ink-2 hover:bg-subtle"
    }`;

  return (
    <div className="mt-5 space-y-4">
      {done && new Date(done.at).getTime() <= now && (
        <p className="rounded-2xl border border-success-line bg-success-soft p-4 text-sm font-semibold text-success-ink">
          Deleted: {summary(done.counts)}.
        </p>
      )}
      {done && new Date(done.at).getTime() > now && (
        <div className="rounded-2xl border border-danger-line bg-danger-soft p-4">
          <p className="font-semibold text-danger-ink">
            Reset scheduled: {summary(done.counts)}
          </p>
          <p className="mt-1 text-sm text-danger-ink">
            Hidden now, permanently deleted in{" "}
            <span className="font-mono font-semibold tabular-nums">
              {countdown(done.at, now)}
            </span>
          </p>
          <button
            type="button"
            className={`${btnSecondary} mt-3 w-full`}
            onClick={undo}
            disabled={busy}
          >
            {busy ? "Undoing…" : "Undo reset"}
          </button>
        </div>
      )}

      <section className={`${card} space-y-4 p-4`}>
        <div>
          <p className={label}>What to reset</p>
          <div className="flex flex-wrap gap-2">
            {ENTITIES.map((e) => {
              const on = entities.includes(e.id);
              return (
                <button
                  key={e.id}
                  type="button"
                  className={chip(on)}
                  onClick={() =>
                    setEntities((cur) =>
                      on ? cur.filter((x) => x !== e.id) : [...cur, e.id],
                    )
                  }
                >
                  {on && (
                    <Check
                      className="mr-1 inline h-3.5 w-3.5"
                      strokeWidth={3}
                      aria-hidden
                    />
                  )}
                  {e.label}
                  {counts && on ? ` (${counts[e.id]})` : ""}
                </button>
              );
            })}
          </div>
        </div>

        <div>
          <label className={label} htmlFor="reset-range">
            Created in
          </label>
          <select
            id="reset-range"
            className={input}
            value={preset}
            onChange={(e) =>
              setPreset(
                e.target.value === "custom" ? "custom" : Number(e.target.value),
              )
            }
          >
            {PRESETS.map((p, i) => (
              <option key={p.label} value={i}>
                {p.label}
              </option>
            ))}
            <option value="custom">Custom…</option>
          </select>
          {preset === "custom" && (
            <div className="mt-2 flex gap-2">
              <span className="self-center text-sm text-ink-2">Last</span>
              <input
                type="number"
                min={1}
                inputMode="numeric"
                className={`${field} w-24`}
                value={custom.amount}
                onChange={(e) =>
                  setCustom({ ...custom, amount: e.target.value })
                }
              />
              <select
                className={field}
                value={custom.unit}
                onChange={(e) =>
                  setCustom({ ...custom, unit: e.target.value as Unit })
                }
              >
                <option value="seconds">seconds</option>
                <option value="minutes">minutes</option>
                <option value="hours">hours</option>
                <option value="days">days</option>
              </select>
            </div>
          )}
        </div>

        <div className="rounded-xl bg-subtle p-3 text-sm text-ink-2">
          {entities.length === 0
            ? "Pick at least one type."
            : counts === null
              ? "Counting…"
              : total === 0
                ? "Nothing matches — nothing will be deleted."
                : delay === 0
                  ? `${total} item${total === 1 ? "" : "s"} will be deleted at once. This can't be undone.`
                  : `${total} item${total === 1 ? "" : "s"} will be hidden now and deleted after the timer.`}
          {entities.includes("customer") && total > 0 && (
            <span className="block text-xs text-ink-3">
              Customers&apos; links stop working; their past orders are kept
              unless you also reset Orders.
            </span>
          )}
          {entities.includes("order") && (
            <span className="block text-xs text-ink-3">
              Reports are built from orders, so they are cleared with them.
            </span>
          )}
          {entities.includes("account") && (
            <span className="block text-xs text-ink-3">
              Team accounts: admins and delivery partners, signed out at once.
              Your own account is never deleted.
            </span>
          )}
          {entities.includes("notification") && (
            <span className="block text-xs text-ink-3">
              Notifications are deleted at once — no trash window, can&apos;t be
              undone.
            </span>
          )}
          {entities.includes("settings") && (
            <span className="block text-xs text-ink-3">
              The saved default QR, UPI ID and bank details are cleared at once
              (undo while this page stays open restores them).
            </span>
          )}
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={label} htmlFor="reset-delay">
              Delete in
            </label>
            <select
              id="reset-delay"
              className={input}
              value={delay}
              onChange={(e) => setDelay(Number(e.target.value))}
            >
              {DELETE_DELAY_SECONDS.map((sec) => (
                <option key={sec} value={sec}>
                  {delayLabel(sec)}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className={label} htmlFor="reset-confirm">
              Type RESET to confirm
            </label>
            <input
              id="reset-confirm"
              className={`${input} font-mono uppercase`}
              autoComplete="off"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value.toUpperCase())}
              placeholder="RESET"
            />
          </div>
        </div>

        {error && <p className="text-sm text-danger-ink">{error}</p>}

        <button
          type="button"
          onClick={reset}
          disabled={
            busy || confirm !== "RESET" || total === 0 || range === undefined
          }
          className="w-full rounded-xl bg-danger py-3 text-base font-semibold text-on-solid transition hover:bg-danger-strong active:scale-[0.99] disabled:opacity-40"
        >
          {busy
            ? "Working…"
            : `Reset ${total || ""} item${total === 1 ? "" : "s"}`}
        </button>
      </section>
    </div>
  );
}
