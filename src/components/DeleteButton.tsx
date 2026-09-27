import { useState } from "react";
import {
  DEFAULT_DELETE_DELAY,
  DELETE_DELAY_MINUTES,
  type TrashEntity,
} from "@/lib/constants";
import { api, errorMessage } from "@/lib/client-api";
import { btnDanger, btnSecondary, input, label as labelCls } from "./ui";

/** SUPER_ADMIN-only delete with a safety window: schedules deletion N minutes out. */
export function DeleteButton({
  entity,
  id,
  name,
  onScheduled,
}: {
  entity: TrashEntity;
  id: string;
  name: string;
  onScheduled: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [minutes, setMinutes] = useState<number>(DEFAULT_DELETE_DELAY);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function confirm() {
    setBusy(true);
    setError(null);
    try {
      await api("/api/admin/trash", {
        method: "POST",
        json: { entity, id, minutes },
      });
      setOpen(false);
      onScheduled();
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <button type="button" className={btnDanger} onClick={() => setOpen(true)}>
        Delete
      </button>
      {open && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4 sm:items-center"
          onClick={() => !busy && setOpen(false)}
        >
          <div
            role="dialog"
            aria-modal="true"
            className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-lg font-semibold text-gray-900">
              Delete {entity}?
            </h2>
            <p className="mt-1 text-sm text-gray-600">
              <span className="font-medium text-gray-900">{name}</span> will be
              hidden now and permanently deleted when the timer runs out. You
              can undo until then.
              {entity === "customer" &&
                " Their link stops working immediately; past orders are kept for your records."}
              {entity === "product" && " Past orders that include it are kept."}
            </p>
            <label className={`${labelCls} mt-4`} htmlFor={`delay-${id}`}>
              Delete in
            </label>
            <select
              id={`delay-${id}`}
              className={input}
              value={minutes}
              onChange={(e) => setMinutes(Number(e.target.value))}
            >
              {DELETE_DELAY_MINUTES.map((m) => (
                <option key={m} value={m}>
                  {m} min
                </option>
              ))}
            </select>
            {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                className={btnSecondary}
                onClick={() => setOpen(false)}
                disabled={busy}
              >
                Cancel
              </button>
              <button
                type="button"
                className={`${btnDanger} !bg-red-600 !text-white hover:!bg-red-700`}
                onClick={confirm}
                disabled={busy}
              >
                {busy ? "Scheduling…" : `Delete in ${minutes} min`}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
