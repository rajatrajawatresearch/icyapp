"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { InstallButton } from "@/components/InstallButton";
import { ThemePicker } from "@/components/ThemePicker";

export function DeliveryHeader({ name }: { name: string }) {
  const router = useRouter();
  const pathname = usePathname();

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.replace("/admin/login");
    router.refresh();
  }

  return (
    <header className="sticky top-0 z-40 border-b border-gray-200 bg-surface/95 backdrop-blur">
      <div className="mx-auto flex max-w-2xl items-center justify-between gap-3 px-4 py-3">
        <Link href="/delivery" className="min-w-0">
          <p className="text-sm font-semibold text-gray-900">🛵 Deliveries</p>
          <p className="truncate text-xs text-gray-500">
            {name} · Delivery partner
          </p>
        </Link>
        <div className="flex shrink-0 items-center gap-2">
          <InstallButton className="hidden sm:inline-flex" />
          <ThemePicker />
          <Link
            href="/delivery/account"
            aria-label="My account"
            className={`grid h-9 w-9 place-items-center rounded-full border ${
              pathname.startsWith("/delivery/account")
                ? "border-brand-600 bg-brand-50 text-brand-700"
                : "border-gray-300 bg-surface text-gray-700"
            }`}
          >
            <svg
              viewBox="0 0 24 24"
              className="h-4.5 w-4.5"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              aria-hidden
            >
              <circle cx="12" cy="8" r="4" />
              <path d="M4 21a8 8 0 0 1 16 0" />
            </svg>
          </Link>
          <button
            type="button"
            onClick={logout}
            className="px-1 text-sm text-gray-600"
          >
            Log out
          </button>
        </div>
      </div>
    </header>
  );
}
