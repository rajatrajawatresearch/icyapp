"use client";

import { useEffect, useState } from "react";
import { Download } from "lucide-react";

// Chrome's install prompt event (not in the standard DOM typings).
type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

/** "Install app" button — only shows when Chrome says the app is installable. */
export function InstallButton({ className = "" }: { className?: string }) {
  const [prompt, setPrompt] = useState<BeforeInstallPromptEvent | null>(null);

  useEffect(() => {
    const onPrompt = (e: Event) => {
      e.preventDefault(); // keep it for our own button
      setPrompt(e as BeforeInstallPromptEvent);
    };
    const onInstalled = () => setPrompt(null);
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  if (!prompt) return null;

  return (
    <button
      type="button"
      onClick={async () => {
        await prompt.prompt();
        await prompt.userChoice;
        setPrompt(null);
      }}
      className={`inline-flex h-10 items-center gap-2 rounded-xl bg-brand-600 px-3.5 text-sm font-semibold text-on-solid shadow-brand ${className}`}
    >
      <Download className="h-4 w-4" aria-hidden />
      Install app
    </button>
  );
}
