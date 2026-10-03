"use client";

import { useEffect } from "react";
import { EyeOff } from "lucide-react";
import { APP_NAME } from "@/lib/brand";

const isEditable = (t: EventTarget | null) =>
  t instanceof HTMLElement &&
  (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName));

/**
 * Screen privacy, as far as a web page can take it. A browser gives a site no
 * way to refuse a screenshot or a screen recording (only a native app can), so
 * this covers the screen in the moments a page can actually detect:
 *
 * - the app is in the background (what the app switcher shows), or, on a
 *   computer, its window is not the one in use (what a recorder sees once you
 *   click it). On a phone a lost focus only means a file picker, a permission
 *   question or the keyboard, so it is ignored there;
 * - the keys that start a capture are pressed (Print Screen, and Cmd/Win+Shift,
 *   which every Mac and Windows screenshot shortcut begins with);
 * - printing or "save as PDF" (blocked in CSS), and saving or dragging images.
 *
 * The cover is switched with an attribute on <html> rather than React state,
 * so it is painted in the same frame as the event.
 */
export function ScreenShield() {
  useEffect(() => {
    const root = document.documentElement;
    const reasons = new Set<string>();
    let keyTimer: ReturnType<typeof setTimeout> | undefined;

    const set = (reason: string, on: boolean) => {
      if (on) reasons.add(reason);
      else reasons.delete(reason);
      if (reasons.size) root.dataset.shield = "on";
      else delete root.dataset.shield;
    };
    /** Cover now, and uncover `ms` after the last call. */
    const flash = (ms: number) => {
      set("keys", true);
      clearTimeout(keyTimer);
      keyTimer = setTimeout(() => set("keys", false), ms);
    };

    const onVisibility = () =>
      set("hidden", document.visibilityState !== "visible");
    // Only a mouse-and-keyboard device has "another window" to click on.
    const desktop = window.matchMedia("(hover: hover) and (pointer: fine)");
    const onBlur = () => {
      if (desktop.matches) set("blur", true);
    };
    const onFocus = () => set("blur", false);
    // Not every browser sends "focus" when the window is back in use (after
    // a system dialog, say), so the cover also checks for itself.
    const onUse = () => {
      if (reasons.has("blur") && document.hasFocus()) set("blur", false);
    };
    const heal = setInterval(onUse, 500);

    const onKeyDown = (e: KeyboardEvent) => {
      const combo = e.metaKey || e.ctrlKey;
      if (e.key === "PrintScreen") flash(2000);
      // Print, and the browsers' own "capture this page" shortcut.
      else if (combo && e.key.toLowerCase() === "p") e.preventDefault();
      else if (combo && e.shiftKey && e.key.toLowerCase() === "s") {
        e.preventDefault();
        flash(2000);
      }
      // Cmd/Win+Shift opens every OS screenshot shortcut. In a text field the
      // same keys select text, so the cover stays out of the way there.
      else if (e.metaKey && e.shiftKey && !isEditable(e.target)) flash(4000);
      onUse();
    };
    const onKeyUp = (e: KeyboardEvent) => {
      if (e.key !== "PrintScreen") return;
      flash(2000);
      // Windows copies the screen on key-down, before any page can react;
      // replacing the clipboard afterwards is the one thing left to do.
      navigator.clipboard?.writeText("").catch(() => {});
    };

    const onContextMenu = (e: MouseEvent) => {
      if (e.target instanceof HTMLImageElement) e.preventDefault();
    };
    const onDragStart = (e: DragEvent) => {
      if (e.target instanceof HTMLImageElement) e.preventDefault();
    };

    onVisibility();
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("pagehide", onVisibility);
    window.addEventListener("blur", onBlur);
    window.addEventListener("focus", onFocus);
    document.addEventListener("pointerdown", onUse, true);
    document.addEventListener("keydown", onKeyDown, true);
    document.addEventListener("keyup", onKeyUp, true);
    document.addEventListener("contextmenu", onContextMenu);
    document.addEventListener("dragstart", onDragStart);
    return () => {
      clearTimeout(keyTimer);
      clearInterval(heal);
      delete root.dataset.shield;
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("pagehide", onVisibility);
      window.removeEventListener("blur", onBlur);
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("pointerdown", onUse, true);
      document.removeEventListener("keydown", onKeyDown, true);
      document.removeEventListener("keyup", onKeyUp, true);
      document.removeEventListener("contextmenu", onContextMenu);
      document.removeEventListener("dragstart", onDragStart);
    };
  }, []);

  // Always in the page; globals.css shows it while <html data-shield="on">.
  return (
    <div className="screen-shield" aria-hidden>
      <div>
        <EyeOff className="mx-auto h-9 w-9 text-ink-3" />
        <p className="mt-3 text-base font-extrabold text-ink">
          Hidden for privacy
        </p>
        <p className="mt-1 text-sm text-ink-3">
          Tap here to go back to {APP_NAME}.
        </p>
      </div>
    </div>
  );
}
