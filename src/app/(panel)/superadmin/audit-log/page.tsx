import type { Metadata } from "next";
import { prisma } from "@/lib/db";
import { requireAdminPage } from "@/lib/auth";
import { formatDateTime } from "@/lib/format";
import { card, pageTitle } from "@/components/ui";

export const metadata: Metadata = { title: "Audit log" };

const PAGE_SIZE = 300;

function actionStyle(action: string) {
  if (action.startsWith("scheduled_delete")) return "bg-red-100 text-red-700";
  if (action.startsWith("undo_delete")) return "bg-amber-100 text-amber-800";
  if (action === "marked_paid") return "bg-emerald-100 text-emerald-800";
  if (action.includes("token") || action.includes("link"))
    return "bg-sky-100 text-sky-800";
  return "bg-gray-100 text-gray-700";
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
      <h1 className={pageTitle}>Audit log</h1>
      <p className="text-sm text-gray-500">
        Newest first · last {PAGE_SIZE} actions
      </p>

      {rows.length === 0 ? (
        <p className="mt-6 text-sm text-gray-500">No activity yet.</p>
      ) : (
        <ul className={`${card} mt-4 divide-y divide-gray-100`}>
          {rows.map((r) => (
            <li
              key={r.id}
              className="flex flex-col gap-1 px-4 py-3 sm:flex-row sm:items-center sm:gap-4"
            >
              <span className="w-32 shrink-0 text-xs tabular-nums text-gray-500">
                {formatDateTime(r.createdAt)}
              </span>
              <span
                className="w-40 shrink-0 truncate text-sm font-medium text-gray-900"
                title={r.actor.email}
              >
                {r.actor.name}
              </span>
              <span
                className={`w-fit shrink-0 rounded-full px-2 py-0.5 font-mono text-xs ${actionStyle(r.action)}`}
              >
                {r.action}
              </span>
              <span className="min-w-0 truncate text-sm text-gray-700">
                {r.details ?? r.targetId}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
