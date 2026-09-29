"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { InstallButton } from "@/components/InstallButton";
import { ThemePicker } from "@/components/ThemePicker";

// Inline stroke icons (24px grid) — no icon dependency.
const ICONS: Record<string, string> = {
  orders:
    "M9 5h6M9 3h6a1 1 0 0 1 1 1v1h2a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1h2V4a1 1 0 0 1 1-1zM9 12h6M9 16h4",
  products: "M21 8 12 3 3 8l9 5 9-5zM3 8v8l9 5 9-5V8M12 13v8",
  customers:
    "M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM22 21v-2a4 4 0 0 0-3-3.9M16 3.1a4 4 0 0 1 0 7.8",
  reports: "M3 3v18h18M7 15l4-4 3 3 5-6",
  admins: "M12 3 4 6v6c0 5 3.5 8 8 9 4.5-1 8-4 8-9V6l-8-3z",
  audit: "M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01",
  settings:
    "M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z",
  reset: "M3 12a9 9 0 1 0 3-6.7L3 8M3 3v5h5",
  account: "M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM4 21a8 8 0 0 1 16 0",
  logout: "M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9",
  menu: "M4 6h16M4 12h16M4 18h16",
  close: "M6 6l12 12M18 6 6 18",
};

function Icon({
  name,
  className = "h-5 w-5",
}: {
  name: string;
  className?: string;
}) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d={ICONS[name]} />
    </svg>
  );
}

const STORE_LINKS = [
  { href: "/admin/orders", label: "Orders", icon: "orders" },
  { href: "/admin/products", label: "Products", icon: "products" },
  { href: "/admin/customers", label: "Customers", icon: "customers" },
  { href: "/admin/reports", label: "Reports", icon: "reports" },
];
const OWNER_LINKS = [
  { href: "/superadmin/admins", label: "Team", icon: "admins" },
  { href: "/superadmin/audit-log", label: "Audit log", icon: "audit" },
  { href: "/superadmin/settings", label: "Settings", icon: "settings" },
  { href: "/superadmin/reset", label: "Data reset", icon: "reset" },
];

/** Admin navigation: fixed left sidebar on desktop, slide-in drawer on phones. */
export function AdminNav({
  name,
  isSuper,
}: {
  name: string;
  isSuper: boolean;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const current = [...STORE_LINKS, ...OWNER_LINKS].find((l) =>
    pathname.startsWith(l.href),
  );

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.replace("/admin/login");
    router.refresh();
  }

  const item = (l: { href: string; label: string; icon: string }) => {
    const active = pathname.startsWith(l.href);
    return (
      <Link
        key={l.href}
        href={l.href}
        onClick={() => setOpen(false)}
        className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-[15px] font-medium transition ${
          active
            ? "bg-brand-600 text-white shadow-sm"
            : "text-gray-700 hover:bg-gray-100"
        }`}
      >
        <Icon name={l.icon} />
        {l.label}
      </Link>
    );
  };

  const sidebar = (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between gap-2 px-4 pb-4 pt-5">
        <div className="flex min-w-0 items-center gap-3">
          <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-brand-600 text-lg text-white shadow-sm">
            🛒
          </div>
          <div className="min-w-0">
            <p className="truncate text-[15px] font-bold text-gray-900">
              Mini Marketplace
            </p>
            <p className="truncate text-xs text-gray-500">
              {isSuper ? "Super admin" : "Admin"}
            </p>
          </div>
        </div>
        <ThemePicker />
      </div>

      <nav className="flex-1 space-y-6 overflow-y-auto px-3 py-2">
        <div className="space-y-1">
          <p className="px-3 pb-1 text-[11px] font-semibold uppercase tracking-wider text-gray-400">
            Store
          </p>
          {STORE_LINKS.map(item)}
        </div>
        {isSuper && (
          <div className="space-y-1">
            <p className="px-3 pb-1 text-[11px] font-semibold uppercase tracking-wider text-gray-400">
              Owner
            </p>
            {OWNER_LINKS.map(item)}
          </div>
        )}
      </nav>

      <div className="space-y-1 border-t border-gray-200 p-3">
        <InstallButton className="mb-2 w-full justify-center" />
        {item({ href: "/admin/account", label: name, icon: "account" })}
        <button
          type="button"
          onClick={logout}
          className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-[15px] font-medium text-gray-600 hover:bg-gray-100"
        >
          <Icon name="logout" />
          Log out
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* Phone: slim top bar with a menu button */}
      <header className="sticky top-0 z-40 flex items-center justify-between gap-3 border-b border-gray-200 bg-surface/85 px-3 py-2.5 backdrop-blur-xl md:hidden">
        <button
          type="button"
          aria-label="Open menu"
          onClick={() => setOpen(true)}
          className="grid h-10 w-10 place-items-center rounded-xl text-gray-800 hover:bg-gray-100"
        >
          <Icon name="menu" className="h-6 w-6" />
        </button>
        <p className="truncate text-base font-semibold text-gray-900">
          {current?.label ?? "Mini Marketplace"}
        </p>
        <ThemePicker />
      </header>

      {/* Phone: slide-in drawer */}
      <div
        className={`fixed inset-0 z-50 md:hidden ${open ? "" : "pointer-events-none"}`}
        aria-hidden={!open}
      >
        <div
          className={`absolute inset-0 bg-black/40 transition-opacity ${open ? "opacity-100" : "opacity-0"}`}
          onClick={() => setOpen(false)}
        />
        <aside
          className={`absolute inset-y-0 left-0 w-[82%] max-w-72 bg-surface shadow-2xl transition-transform duration-200 ${
            open ? "translate-x-0" : "-translate-x-full"
          }`}
        >
          <button
            type="button"
            aria-label="Close menu"
            onClick={() => setOpen(false)}
            className="absolute right-2 top-2 hidden"
          >
            <Icon name="close" />
          </button>
          {sidebar}
        </aside>
      </div>

      {/* Desktop: fixed sidebar */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 border-r border-gray-200 bg-surface md:block">
        {sidebar}
      </aside>
    </>
  );
}
