import { useState } from "react";
import { Trash2 } from "lucide-react";
import {
  DEFAULT_DELETE_DELAY_SECONDS,
  DELETE_DELAY_SECONDS,
  delayLabel,
  type TrashEntity,
} from "@/lib/constants";
import { api, errorMessage } from "@/lib/client-api";
import {
  btnDanger,
  btnDangerSolid,
  btnSecondary,
  input,
  label as labelCls,
  scrim,
  sheet,
} from "./ui";

/** SUPER_ADMIN-only delete: at once, or after a delay during which it can be undone. */
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
  const [seconds, setSeconds] = useState<number>(DEFAULT_DELETE_DELAY_SECONDS);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function confirm() {
    setBusy(true);
    setError(null);
    try {
      await api("/api/admin/trash", {
        method: "POST",
        json: { entity, id, seconds },
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
      <button
        type="button"
        aria-label={`Delete ${name}`}
        title="Delete"
        className={`${btnDanger} px-3`}
        onClick={() => setOpen(true)}
      >
        <Trash2 className="h-4 w-4" aria-hidden />
      </button>
      {open && (
        <div className={scrim} onClick={() => !busy && setOpen(false)}>
          <div
            role="dialog"
            aria-modal="true"
            className={`${sheet} p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] sm:max-w-sm`}
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-lg font-bold text-ink">Delete {entity}?</h2>
            <p className="mt-1 text-sm text-ink-2">
              <span className="font-semibold text-ink">{name}</span>.{" "}
              {seconds === 0
                ? "This can't be undone."
                : "Undo it in Settings, Delete, until the timer ends."}
            </p>
            <label className={`${labelCls} mt-4`} htmlFor={`delay-${id}`}>
              Delete in
            </label>
            <select
              id={`delay-${id}`}
              className={input}
              value={seconds}
              onChange={(e) => setSeconds(Number(e.target.value))}
            >
              {DELETE_DELAY_SECONDS.map((sec) => (
                <option key={sec} value={sec}>
                  {delayLabel(sec)}
                </option>
              ))}
            </select>
            {error && <p className="mt-3 text-sm text-danger-ink">{error}</p>}
            <div className="mt-5 grid grid-cols-2 gap-2">
              <button
                type="button"
                className={btnSecondary}
                onClick={() => setOpen(false)}
                disabled={busy}
              >
                Keep it
              </button>
              <button
                type="button"
                className={btnDangerSolid}
                onClick={confirm}
                disabled={busy}
              >
                {busy
                  ? "Deleting…"
                  : seconds === 0
                    ? "Delete now"
                    : `Delete in ${delayLabel(seconds).toLowerCase()}`}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
