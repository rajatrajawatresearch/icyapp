"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Bike,
  ChartLine,
  ClipboardList,
  LogOut,
  Menu,
  Package,
  RotateCcw,
  ScrollText,
  Settings,
  ShieldCheck,
  UserRound,
  Users,
  X,
  type LucideIcon,
} from "lucide-react";
import { InstallButton } from "@/components/InstallButton";
import { Brand, Logo } from "@/components/Logo";
import { NotificationBell } from "@/components/NotificationBell";
import { ThemePicker } from "@/components/ThemePicker";
import { APP_NAME } from "@/lib/brand";
import { disablePush } from "@/lib/push-client";

type NavLink = { href: string; label: string; Icon: LucideIcon };

const STORE_LINKS: NavLink[] = [
  { href: "/admin/orders", label: "Orders", Icon: ClipboardList },
  { href: "/admin/products", label: "Products", Icon: Package },
  { href: "/admin/customers", label: "Customers", Icon: Users },
  { href: "/admin/riders", label: "Delivery team", Icon: Bike },
  { href: "/admin/reports", label: "Reports", Icon: ChartLine },
];
const OWNER_LINKS: NavLink[] = [
  { href: "/superadmin/admins", label: "Team", Icon: ShieldCheck },
  { href: "/superadmin/audit-log", label: "Audit log", Icon: ScrollText },
  { href: "/superadmin/settings", label: "Settings", Icon: Settings },
  { href: "/superadmin/reset", label: "Data reset", Icon: RotateCcw },
];

/** True from 768px up; null until measured on the client. */
function useIsDesktop() {
  const [desktop, setDesktop] = useState<boolean | null>(null);
  useEffect(() => {
    const mq = window.matchMedia("(min-width: 768px)");
    const update = () => setDesktop(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);
  return desktop;
}

/** Admin navigation: a fixed sidebar on desktop, a slide-in drawer on phones. */
export function AdminNav({ name, isSuper }: { name: string; isSuper: boolean }) {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const desktop = useIsDesktop();

  async function logout() {
    await disablePush(); // this device should stop getting the store's alerts
    await fetch("/api/auth/logout", { method: "POST" });
    router.replace("/admin/login");
    router.refresh();
  }

  // One live instance only (it polls): in the sidebar on desktop, in the top bar on phones.
  const tools = (align: "left" | "right") => (
    <div className="flex items-center gap-2">
      <NotificationBell endpoint="/api/notifications" href="/admin/orders" align={align} />
      <ThemePicker align={align} />
    </div>
  );

  const item = ({ href, label, Icon }: NavLink) => {
    const active = pathname.startsWith(href);
    return (
      <Link
        key={href}
        href={href}
        onClick={() => setOpen(false)}
        aria-current={active ? "page" : undefined}
        className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-[15px] transition ${
          active
            ? "bg-brand-100 font-bold text-brand-900"
            : "font-medium text-ink-2 hover:bg-muted hover:text-ink"
        }`}
      >
        <Icon
          className={`h-5 w-5 shrink-0 ${active ? "text-brand-700" : ""}`}
          aria-hidden
        />
        <span className="truncate">{label}</span>
      </Link>
    );
  };

  return (
    <>
      {/* Phone: slim top bar */}
      <header className="sticky top-0 z-30 flex items-center justify-between gap-3 border-b border-line bg-surface/85 px-3 py-2.5 backdrop-blur-xl md:hidden">
        <button
          type="button"
          aria-label="Open menu"
          onClick={() => setOpen(true)}
          className="grid h-10 w-10 place-items-center rounded-xl text-ink hover:bg-muted"
        >
          <Menu className="h-6 w-6" aria-hidden />
        </button>
        <Link href="/admin/orders" className="flex items-center gap-2">
          <Logo className="h-8 w-8" />
          <span className="text-base font-extrabold tracking-[-0.02em] text-ink">
            {APP_NAME}
          </span>
        </Link>
        {desktop === false ? tools("right") : <span className="w-[5.5rem]" />}
      </header>

      {/* Phone: backdrop behind the open drawer */}
      <div
        aria-hidden
        onClick={() => setOpen(false)}
        className={`fixed inset-0 z-40 bg-scrim transition-opacity md:hidden ${
          open ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
      />

      {/* The sidebar itself: off-canvas on phones, always there on desktop */}
      <aside
        inert={desktop === false && !open}
        className={`fixed inset-y-0 left-0 z-50 flex w-[84%] max-w-72 flex-col border-r border-line bg-surface transition-transform duration-200 md:z-30 md:w-64 md:translate-x-0 ${
          open ? "translate-x-0 shadow-pop" : "-translate-x-full"
        }`}
      >
        <div className="flex items-center justify-between gap-2 px-4 pt-5 pb-4">
          <Brand sub={isSuper ? "Super admin" : "Admin"} />
          {desktop ? (
            tools("left")
          ) : (
            <button
              type="button"
              aria-label="Close menu"
              onClick={() => setOpen(false)}
              className="grid h-10 w-10 place-items-center rounded-xl text-ink-2 hover:bg-muted md:hidden"
            >
              <X className="h-5 w-5" aria-hidden />
            </button>
          )}
        </div>

        <nav className="flex-1 space-y-5 overflow-y-auto px-3 py-2">
          <div className="space-y-1">
            <p className="px-3 pb-1 text-xs font-semibold text-ink-3">Store</p>
            {STORE_LINKS.map(item)}
          </div>
          {isSuper && (
            <div className="space-y-1">
              <p className="px-3 pb-1 text-xs font-semibold text-ink-3">Owner</p>
              {OWNER_LINKS.map(item)}
            </div>
          )}
        </nav>

        <div className="space-y-1 border-t border-line p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
          <InstallButton className="mb-2 w-full justify-center" />
          {item({ href: "/admin/account", label: name, Icon: UserRound })}
          <button
            type="button"
            onClick={logout}
            className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-[15px] font-medium text-ink-2 hover:bg-muted hover:text-ink"
          >
            <LogOut className="h-5 w-5" aria-hidden />
            Log out
          </button>
        </div>
      </aside>
    </>
  );
}
