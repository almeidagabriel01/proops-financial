import { Skeleton } from '@/components/ui/skeleton';

export default function DashboardLoading() {
  return (
    <div className="h-full overflow-y-auto">
      <div className="w-full space-y-4 px-4 py-4 pb-24 lg:px-8 lg:py-6 lg:pb-28">
        {/* Hero skeleton */}
        <div className="hidden lg:flex items-center justify-between">
          <div className="space-y-2">
            <Skeleton className="h-9 w-64" />
            <Skeleton className="h-4 w-40" />
          </div>
          <Skeleton className="h-9 w-40 rounded-lg" />
        </div>
        <div className="flex items-center justify-between lg:hidden">
          <Skeleton className="h-7 w-40" />
          <Skeleton className="h-9 w-32 rounded-lg" />
        </div>

        {/* Summary cards */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-24 rounded-xl" />
          ))}
        </div>

        {/* Month progress */}
        <Skeleton className="h-24 rounded-xl" />

        {/* Charts — desktop 3 col, mobile 1 col */}
        <div className="hidden lg:grid lg:grid-cols-[1fr_1fr_300px] lg:gap-6">
          <Skeleton className="h-56 rounded-xl" />
          <Skeleton className="h-56 rounded-xl" />
          <Skeleton className="h-56 rounded-xl" />
        </div>
        <div className="grid grid-cols-1 gap-4 lg:hidden">
          <Skeleton className="h-48 rounded-xl" />
          <Skeleton className="h-48 rounded-xl" />
        </div>

        {/* Breakdown */}
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 lg:gap-6">
          <Skeleton className="h-48 rounded-xl" />
          <Skeleton className="h-48 rounded-xl" />
        </div>
      </div>
    </div>
  );
}
