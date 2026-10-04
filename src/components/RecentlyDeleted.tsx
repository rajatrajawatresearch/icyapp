import { useState } from "react";
import type { TrashEntity } from "@/lib/constants";
import { api, errorMessage } from "@/lib/client-api";
import { countdown } from "@/lib/format";
import { useNow } from "./useNow";
import { btnSecondary } from "./ui";

/** `entity` on a row overrides the list's own, so one list can mix kinds. */
type Row = {
  id: string;
  label: string;
  scheduledDeleteAt: string | null;
  entity?: TrashEntity;
};

/** "Recently deleted" rows with a live countdown and Undo (SUPER_ADMIN only). */
export function RecentlyDeleted({
  entity,
  rows,
  onChange,
}: {
  entity: TrashEntity;
  rows: Row[];
  onChange: () => void;
}) {
  const now = useNow();
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const pending = rows.filter(
    (r) => r.scheduledDeleteAt && new Date(r.scheduledDeleteAt).getTime() > now,
  );
  if (pending.length === 0 && !error) return null;

  async function undo(id: string) {
    const kind = rows.find((r) => r.id === id)?.entity ?? entity;
    setBusyId(id);
    setError(null);
    try {
      await api("/api/admin/trash/undo", {
        method: "POST",
        json: { entity: kind, id },
      });
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusyId(null);
      onChange();
    }
  }

  return (
    <section className="mt-5 rounded-2xl border border-dashed border-danger-line bg-danger-soft/60 p-4">
      <h2 className="text-sm font-semibold text-danger-ink">Recently deleted</h2>
      {error && <p className="mt-2 text-sm text-danger-ink">{error}</p>}
      <ul className="mt-3 divide-y divide-danger-line">
        {pending.map((r) => (
          <li
            key={r.id}
            className="flex items-center justify-between gap-3 py-2"
          >
            <span className="min-w-0 truncate text-sm text-ink">
              {r.label}
            </span>
            <span className="flex shrink-0 items-center gap-3">
              <span className="font-mono text-sm tabular-nums text-danger-ink">
                {countdown(r.scheduledDeleteAt!, now)}
              </span>
              <button
                type="button"
                className={btnSecondary}
                onClick={() => undo(r.id)}
                disabled={busyId === r.id}
              >
                {busyId === r.id ? "Undoing…" : "Undo"}
              </button>
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}
