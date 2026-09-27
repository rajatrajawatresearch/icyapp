"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { InstallButton } from "@/components/InstallButton";
import { ThemePicker } from "@/components/ThemePicker";

const ADMIN_LINKS = [
  { href: "/admin/orders", label: "Orders" },
  { href: "/admin/products", label: "Products" },
  { href: "/admin/customers", label: "Customers" },
  { href: "/admin/reports", label: "Reports" },
];
const SUPER_LINKS = [
  { href: "/superadmin/admins", label: "Admins" },
  { href: "/superadmin/audit-log", label: "Audit log" },
];

export function AdminNav({
  name,
  isSuper,
}: {
  name: string;
  isSuper: boolean;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const links = isSuper ? [...ADMIN_LINKS, ...SUPER_LINKS] : ADMIN_LINKS;

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.replace("/admin/login");
    router.refresh();
  }

  return (
    <header className="sticky top-0 z-40 border-b border-gray-200 bg-surface/95 backdrop-blur">
      <div className="mx-auto flex max-w-5xl items-center justify-between gap-3 px-4 pt-3 sm:px-6">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-gray-900">
            Mini Marketplace
          </p>
          <p className="truncate text-xs text-gray-500">
            {name} · {isSuper ? "Super admin" : "Admin"}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <InstallButton className="hidden sm:inline-flex" />
          <ThemePicker />
          <Link
            href="/admin/account"
            aria-label="My account"
            className={`grid h-9 w-9 place-items-center rounded-full border ${
              pathname.startsWith("/admin/account")
                ? "border-brand-600 bg-brand-50 text-brand-700"
                : "border-gray-300 bg-surface text-gray-700 hover:bg-gray-50"
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
            className="px-1 text-sm text-gray-600 hover:text-gray-900"
          >
            Log out
          </button>
        </div>
      </div>
      <nav className="mx-auto flex max-w-5xl gap-1 overflow-x-auto px-3 py-2 sm:px-5 [scrollbar-width:none]">
        {links.map((l) => {
          const active = pathname.startsWith(l.href);
          return (
            <Link
              key={l.href}
              href={l.href}
              className={`shrink-0 rounded-full px-3 py-1.5 text-sm font-medium ${
                active
                  ? "bg-brand-600 text-white"
                  : "text-gray-700 hover:bg-gray-100"
              }`}
            >
              {l.label}
            </Link>
          );
        })}
      </nav>
    </header>
  );
}
