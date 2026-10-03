import type { Metadata } from "next";
import { prisma } from "@/lib/db";
import { requireAdminPage } from "@/lib/auth";
import { formatDateTime } from "@/lib/format";
import { SectionTabs } from "@/components/SectionTabs";
import { card, pageTitle } from "@/components/ui";

export const metadata: Metadata = { title: "Audit log" };

const PAGE_SIZE = 300;

function actionStyle(action: string) {
  if (action.startsWith("scheduled_delete")) return "bg-danger-soft text-danger-ink";
  if (action.startsWith("undo_delete")) return "bg-warning-soft text-warning-ink";
  if (action === "marked_paid") return "bg-success-soft text-success-ink";
  if (action.includes("token") || action.includes("link"))
    return "bg-brand-100 text-brand-800";
  return "bg-muted text-ink-2";
}

export default async function AuditLogPage() {
  await requireAdminPage({ superOnly: true });
  const rows = await prisma.auditLog.findMany({
    orderBy: { createdAt: "desc" },
    take: PAGE_SIZE,
    include: { actor: { select: { name: true, email: true } } },
  });

  return (
    <div>
      <SectionTabs section="reports" />
      <h1 className={pageTitle}>Audit log</h1>
      <p className="text-sm text-ink-3">
        The last {PAGE_SIZE} actions, newest first.
      </p>

      {rows.length === 0 ? (
        <p className="mt-6 text-sm text-ink-3">No activity yet.</p>
      ) : (
        <ul className={`${card} mt-4 divide-y divide-line`}>
          {rows.map((r) => (
            <li
              key={r.id}
              className="flex flex-col gap-1 px-4 py-3 sm:flex-row sm:items-center sm:gap-4"
            >
              <span className="w-32 shrink-0 text-xs tabular-nums text-ink-3">
                {formatDateTime(r.createdAt)}
              </span>
              <span
                className="w-40 shrink-0 truncate text-sm font-medium text-ink"
                title={r.actor.email}
              >
                {r.actor.name}
              </span>
              <span
                className={`w-fit shrink-0 rounded-full px-2 py-0.5 font-mono text-xs ${actionStyle(r.action)}`}
              >
                {r.action}
              </span>
              <span className="min-w-0 truncate text-sm text-ink-2">
                {r.details ?? r.targetId}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
