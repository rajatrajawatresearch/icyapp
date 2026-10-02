"use client";

import { useEffect, useRef, useState } from "react";
import { Check, Moon, Palette, Sun, SunMoon } from "lucide-react";
import {
  ACCENTS,
  ACCENT_STORAGE_KEY,
  DEFAULT_ACCENT,
  THEME_STORAGE_KEY,
  type AccentId,
  type ThemeMode,
} from "@/lib/theme";
import { iconBtn } from "./ui";

function applyTheme(mode: ThemeMode, accent: AccentId) {
  const root = document.documentElement;
  const dark =
    mode === "dark" ||
    (mode === "system" &&
      window.matchMedia("(prefers-color-scheme: dark)").matches);
  root.dataset.theme = dark ? "dark" : "light";
  root.dataset.accent = accent;
}

function read<T extends string>(key: string, fallback: T): T {
  try {
    return (localStorage.getItem(key) as T | null) ?? fallback;
  } catch {
    return fallback;
  }
}

function write(key: string, value: string) {
  try {
    localStorage.setItem(key, value);
  } catch {}
}

const MODES = [
  { id: "light", label: "Light", Icon: Sun },
  { id: "dark", label: "Dark", Icon: Moon },
  { id: "system", label: "Auto", Icon: SunMoon },
] as const;

/** Button + popover for light/dark/auto and the accent flavour. Remembered per device. */
export function ThemePicker({ align = "right" }: { align?: "left" | "right" }) {
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<ThemeMode>("system");
  const [accent, setAccent] = useState<AccentId>(DEFAULT_ACCENT);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- sync from storage after mount
    setMode(read<ThemeMode>(THEME_STORAGE_KEY, "system"));
    setAccent(read<AccentId>(ACCENT_STORAGE_KEY, DEFAULT_ACCENT));
  }, []);

  // Follow OS changes while in Auto.
  useEffect(() => {
    if (mode !== "system") return;
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => applyTheme("system", accent);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, [mode, accent]);

  useEffect(() => {
    if (!open) return;
    const close = (e: PointerEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("pointerdown", close);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", close);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  function chooseMode(next: ThemeMode) {
    setMode(next);
    write(THEME_STORAGE_KEY, next);
    applyTheme(next, accent);
  }

  function chooseAccent(next: AccentId) {
    setAccent(next);
    write(ACCENT_STORAGE_KEY, next);
    applyTheme(mode, next);
  }

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        aria-label="Appearance"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        className={iconBtn}
      >
        <Palette className="h-[18px] w-[18px]" aria-hidden />
      </button>
      {open && (
        <div
          className={`absolute top-full z-50 mt-2 w-64 animate-pop rounded-2xl border border-line bg-raised p-3 shadow-pop ${
            align === "right" ? "right-0" : "left-0"
          }`}
        >
          <p className="mb-2 text-xs font-semibold text-ink-3">Appearance</p>
          <div className="grid grid-cols-3 gap-1 rounded-xl bg-muted p-1">
            {MODES.map(({ id, label, Icon }) => (
              <button
                key={id}
                type="button"
                aria-pressed={mode === id}
                onClick={() => chooseMode(id)}
                className={`flex flex-col items-center gap-1 rounded-lg py-2 text-xs font-semibold transition ${
                  mode === id
                    ? "bg-surface text-ink shadow-xs"
                    : "text-ink-3 hover:text-ink"
                }`}
              >
                <Icon className="h-4 w-4" aria-hidden />
                {label}
              </button>
            ))}
          </div>

          <p className="mt-4 mb-2 text-xs font-semibold text-ink-3">Flavour</p>
          <div className="grid grid-cols-4 gap-1">
            {ACCENTS.map((a) => (
              <button
                key={a.id}
                type="button"
                aria-pressed={accent === a.id}
                onClick={() => chooseAccent(a.id)}
                className="flex flex-col items-center gap-1.5 rounded-lg py-1.5 text-[11px] font-medium text-ink-2 hover:bg-subtle"
              >
                {/* data-accent scopes --brand to this swatch (see globals.css). */}
                <span
                  data-accent={a.id}
                  className={`grid h-9 w-9 place-items-center rounded-full bg-(--brand) text-on-solid ring-offset-2 ring-offset-raised ${
                    accent === a.id ? "ring-2 ring-(--brand)" : ""
                  }`}
                >
                  {accent === a.id && (
                    <Check className="h-4 w-4" strokeWidth={3} aria-hidden />
                  )}
                </span>
                <span className="leading-tight">{a.label}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
