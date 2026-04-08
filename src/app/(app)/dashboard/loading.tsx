import { Skeleton } from '@/components/ui/skeleton';

export default function DashboardLoading() {
  return (
    <div className="mx-auto max-w-screen-lg space-y-4 px-4 py-6">
      {/* Period selector skeleton */}
      <Skeleton className="h-9 w-48 rounded-lg" />

      {/* Summary cards skeleton */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-24 rounded-xl" />
        ))}
      </div>

      {/* Charts skeleton */}
      <div className="grid gap-4 sm:grid-cols-2">
        <Skeleton className="h-48 rounded-xl" />
        <Skeleton className="h-48 rounded-xl" />
      </div>

      {/* Breakdown skeleton */}
      <Skeleton className="h-64 rounded-xl" />
    </div>
  );
}
