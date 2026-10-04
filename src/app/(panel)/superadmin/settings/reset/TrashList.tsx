"use client";

import { useCallback, useEffect, useState } from "react";
import type { TrashEntity } from "@/lib/constants";
import { api } from "@/lib/client-api";
import { RecentlyDeleted } from "@/components/RecentlyDeleted";

type Row = { entity: TrashEntity; id: string; label: string; scheduledDeleteAt: string };

/** Every delete that can still be undone, whatever it was, in one list. */
export function TrashList() {
  const [rows, setRows] = useState<Row[]>([]);
  const load = useCallback(async () => {
    try {
      setRows((await api<{ items: Row[] }>("/api/admin/trash")).items);
    } catch {
      // The list simply stays as it was; the next visit loads it again.
    }
  }, []);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- initial data fetch
    load();
  }, [load]);
  return <RecentlyDeleted entity="order" rows={rows} onChange={load} />;
}
