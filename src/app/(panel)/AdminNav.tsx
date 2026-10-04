"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Bike,
  ChartLine,
  ClipboardList,
  Menu,
  Package,
  Settings,
  UserRound,
  Users,
  X,
  type LucideIcon,
} from "lucide-react";
import { InstallButton } from "@/components/InstallButton";
import { Brand, Logo } from "@/components/Logo";
import { LogoutButton } from "@/components/LogoutButton";
import { NotificationBell } from "@/components/NotificationBell";
import { ThemePicker } from "@/components/ThemePicker";
import { APP_NAME } from "@/lib/brand";
import type { ModuleId } from "@/lib/modules";

type NavLink = {
  href: string;
  label: string;
  Icon: LucideIcon;
  /** The section this entry belongs to; an admin sees it only when they have it. */
  module?: ModuleId;
  /** Other pages of the same section (reached by its tabs) that keep this item lit. */
  also?: string[];
};

const STORE_LINKS: NavLink[] = [
  { href: "/admin/orders", label: "Orders", Icon: ClipboardList, module: "orders" },
  { href: "/admin/products", label: "Products", Icon: Package, module: "products" },
  { href: "/admin/customers", label: "Customers", Icon: Users, module: "customers" },
  // Also holds live tracking of deliveries.
  {
    href: "/admin/riders",
    label: "Delivery team",
    Icon: Bike,
    module: "delivery",
    also: ["/admin/tracking"],
  },
  // For the super admin this section also holds the audit log.
  {
    href: "/admin/reports",
    label: "Reports",
    Icon: ChartLine,
    module: "reports",
    also: ["/superadmin/audit-log"],
  },
];
// Settings holds the store's details, the team and the data reset.
const OWNER_LINKS: NavLink[] = [
  { href: "/superadmin/settings", label: "Settings", Icon: Settings },
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
export function AdminNav({
  name,
  isSuper,
  modules,
}: {
  name: string;
  isSuper: boolean;
  /** The sections an admin may use; ignored for a super admin, who has all. */
  modules: string[];
}) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const desktop = useIsDesktop();

  // One live instance only (the bell polls): at the top of the sidebar on
  // desktop, in the top bar on phones.
  const tools = (align: "left" | "right") => (
    <div className="flex items-center gap-2">
      <NotificationBell endpoint="/api/notifications" href="/admin/orders" align={align} />
      <ThemePicker align={align} />
      <LogoutButton icon />
    </div>
  );

  const item = ({ href, label, Icon, also = [] }: NavLink) => {
    const active = [href, ...also].some((p) => pathname.startsWith(p));
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
        <div className="flex items-center gap-2">
          <Logo className="h-8 w-8" refresh />
          <span className="text-base font-extrabold tracking-[-0.02em] text-ink">
            {APP_NAME}
          </span>
        </div>
        {desktop === false ? tools("right") : <span className="w-[8.5rem]" />}
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
        <div className="flex items-center justify-between gap-2 px-4 pt-5 pb-3">
          <Brand sub={isSuper ? "Super admin" : "Admin"} refresh />
          <button
            type="button"
            aria-label="Close menu"
            onClick={() => setOpen(false)}
            className="grid h-10 w-10 place-items-center rounded-xl text-ink-2 hover:bg-muted md:hidden"
          >
            <X className="h-5 w-5" aria-hidden />
          </button>
        </div>
        {/* Desktop: notifications, theme and log out sit in a row under the name. */}
        {desktop && <div className="px-4 pb-3">{tools("left")}</div>}

        <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-2">
          {STORE_LINKS.filter(
            (l) => isSuper || !l.module || modules.includes(l.module),
          ).map(item)}
          {isSuper && OWNER_LINKS.map(item)}
        </nav>

        <div className="space-y-1 border-t border-line p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
          <InstallButton className="mb-2 w-full justify-center" />
          {item({ href: "/admin/account", label: name, Icon: UserRound })}
        </div>
      </aside>
    </>
  );
}
