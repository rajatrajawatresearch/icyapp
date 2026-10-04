"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Bike,
  ChartLine,
  MapPinned,
  RotateCcw,
  ScrollText,
  ShieldCheck,
  Store,
  type LucideIcon,
} from "lucide-react";

type Tab = { href: string; label: string; Icon: LucideIcon };

// Pages that belong together share one item in the sidebar and switch here.
const SECTIONS = {
  settings: [
    { href: "/superadmin/settings", label: "Store", Icon: Store },
    { href: "/superadmin/settings/team", label: "Team", Icon: ShieldCheck },
    { href: "/superadmin/settings/reset", label: "Delete", Icon: RotateCcw },
  ],
  delivery: [
    { href: "/admin/riders", label: "Team", Icon: Bike },
    { href: "/admin/tracking", label: "Live tracking", Icon: MapPinned },
  ],
  reports: [
    { href: "/admin/reports", label: "Reports", Icon: ChartLine },
    { href: "/superadmin/audit-log", label: "Audit log", Icon: ScrollText },
  ],
} satisfies Record<string, Tab[]>;

export function SectionTabs({ section }: { section: keyof typeof SECTIONS }) {
  const pathname = usePathname();
  return (
    <nav
      aria-label="Sections"
      className="mb-5 inline-flex max-w-full gap-1 overflow-x-auto rounded-xl bg-muted p-1"
    >
      {SECTIONS[section].map(({ href, label, Icon }) => {
        const active = pathname === href;
        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? "page" : undefined}
            className={`flex shrink-0 items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition ${
              active ? "bg-surface text-ink shadow-xs" : "text-ink-3 hover:text-ink"
            }`}
          >
            <Icon className="h-4 w-4" aria-hidden />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
