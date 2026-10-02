import { ListSkeleton, Skeleton } from "@/components/Skeleton";

/** Shown while a server-rendered admin page (reports, audit log, settings) loads. */
export default function PanelLoading() {
  return (
    <div>
      <Skeleton className="h-9 w-44" />
      <ListSkeleton rows={4} className="h-20" />
    </div>
  );
}
