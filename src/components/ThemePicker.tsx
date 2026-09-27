"use client";

import { useEffect, useRef, useState } from "react";
import {
  ACCENTS,
  ACCENT_STORAGE_KEY,
  SURFACE_COLOR,
  THEME_STORAGE_KEY,
  type AccentId,
  type ThemeMode,
} from "@/lib/theme";

function systemPrefersDark() {
  return window.matchMedia("(prefers-color-scheme: dark)").matches;
}

function applyTheme(mode: ThemeMode, accent: AccentId) {
  const root = document.documentElement;
  const dark = mode === "dark" || (mode === "system" && systemPrefersDark());
  root.dataset.theme = dark ? "dark" : "light";
  root.dataset.accent = accent;
  // Keep the mobile browser/installed-app status bar in sync with the header.
  document.querySelectorAll('meta[name="theme-color"]').forEach((m) => {
    m.setAttribute("content", dark ? SURFACE_COLOR.dark : SURFACE_COLOR.light);
    m.removeAttribute("media");
  });
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

const MODES: { id: ThemeMode; label: string }[] = [
  { id: "light", label: "Light" },
  { id: "dark", label: "Dark" },
  { id: "system", label: "Auto" },
];

/** Compact button + popover for light/dark/auto and the accent colour. Per device. */
export function ThemePicker() {
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<ThemeMode>("system");
  const [accent, setAccent] = useState<AccentId>("blue");
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- sync from storage after mount
    setMode(read<ThemeMode>(THEME_STORAGE_KEY, "system"));
    setAccent(read<AccentId>(ACCENT_STORAGE_KEY, "blue"));
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
    document.addEventListener("pointerdown", close);
    return () => document.removeEventListener("pointerdown", close);
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
        aria-label="Theme and colour"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        className="grid h-9 w-9 place-items-center rounded-full border border-gray-300 bg-surface text-gray-700 hover:bg-gray-50"
      >
        <svg
          viewBox="0 0 24 24"
          className="h-4.5 w-4.5"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          aria-hidden
        >
          <circle cx="12" cy="12" r="9" />
          <path d="M12 3a9 9 0 0 0 0 18z" fill="currentColor" />
        </svg>
      </button>
      {open && (
        <div className="absolute right-0 top-full z-50 mt-2 w-60 rounded-xl border border-gray-200 bg-surface p-3 shadow-lg">
          <p className="mb-2 text-xs font-medium text-gray-500">Appearance</p>
          <div className="grid grid-cols-3 gap-1 rounded-lg bg-gray-100 p-1">
            {MODES.map((m) => (
              <button
                key={m.id}
                type="button"
                onClick={() => chooseMode(m.id)}
                className={`rounded-md py-1.5 text-sm font-medium ${
                  mode === m.id
                    ? "bg-surface text-gray-900 shadow-sm"
                    : "text-gray-600"
                }`}
              >
                {m.label}
              </button>
            ))}
          </div>
          <p className="mb-2 mt-3 text-xs font-medium text-gray-500">Colour</p>
          <div className="flex justify-between">
            {ACCENTS.map((a) => (
              <button
                key={a.id}
                type="button"
                aria-label={a.label}
                aria-pressed={accent === a.id}
                onClick={() => chooseAccent(a.id)}
                className={`grid h-10 w-10 place-items-center rounded-full ring-offset-2 ring-offset-[var(--surface)] ${
                  accent === a.id ? "ring-2 ring-gray-900" : ""
                }`}
                style={{ backgroundColor: a.color }}
              >
                {accent === a.id && (
                  <svg
                    viewBox="0 0 24 24"
                    className="h-5 w-5 text-white"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="3"
                    aria-hidden
                  >
                    <path d="M5 12l5 5L20 7" />
                  </svg>
                )}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
