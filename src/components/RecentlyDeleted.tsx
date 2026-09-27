import { useState } from "react";
import type { TrashEntity } from "@/lib/constants";
import { api, errorMessage } from "@/lib/client-api";
import { countdown } from "@/lib/format";
import { useNow } from "./useNow";
import { btnSecondary } from "./ui";

type Row = { id: string; label: string; scheduledDeleteAt: string | null };

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
    setBusyId(id);
    setError(null);
    try {
      await api("/api/admin/trash/undo", {
        method: "POST",
        json: { entity, id },
      });
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusyId(null);
      onChange();
    }
  }

  return (
    <section className="mt-8 rounded-xl border border-dashed border-red-300 bg-red-50/60 p-4">
      <h2 className="text-sm font-semibold text-red-800">Recently deleted</h2>
      <p className="text-xs text-red-700/80">
        Permanently removed when the timer hits 0:00.
      </p>
      {error && <p className="mt-2 text-sm text-red-700">{error}</p>}
      <ul className="mt-3 divide-y divide-red-200">
        {pending.map((r) => (
          <li
            key={r.id}
            className="flex items-center justify-between gap-3 py-2"
          >
            <span className="min-w-0 truncate text-sm text-gray-800">
              {r.label}
            </span>
            <span className="flex shrink-0 items-center gap-3">
              <span className="font-mono text-sm tabular-nums text-red-700">
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
