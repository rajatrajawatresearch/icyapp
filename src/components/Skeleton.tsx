/** Placeholder blocks shown while a list loads (instead of a "Loading…" line). */
export function Skeleton({ className = "h-4 w-full" }: { className?: string }) {
  return <div className={`animate-pulse rounded-lg bg-muted ${className}`} />;
}

export function ListSkeleton({
  rows = 3,
  className = "h-28",
}: {
  rows?: number;
  className?: string;
}) {
  return (
    <div className="mt-4 space-y-3" aria-busy="true" aria-label="Loading">
      {Array.from({ length: rows }, (_, i) => (
        <Skeleton key={i} className={`w-full rounded-2xl ${className}`} />
      ))}
    </div>
  );
}
