import { Skeleton } from '@/components/ui/skeleton';

export default function TransactionsLoading() {
  return (
    <div className="flex w-full flex-col overflow-hidden">
      {/* Desktop hero */}
      <div className="hidden lg:flex items-center justify-between px-8 pt-6 pb-3 shrink-0">
        <div className="space-y-2">
          <Skeleton className="h-9 w-48" />
          <Skeleton className="h-4 w-32" />
        </div>
        <Skeleton className="h-10 w-36 rounded-lg" />
      </div>

      {/* Filter bar */}
      <div className="border-b border-border px-4 py-3 lg:px-8 shrink-0">
        <div className="hidden lg:flex gap-3">
          <Skeleton className="h-9 w-64 rounded-lg" />
          <Skeleton className="h-9 w-36 rounded-lg" />
          <Skeleton className="h-9 w-32 rounded-lg" />
          <Skeleton className="h-9 w-44 rounded-lg" />
        </div>
        <div className="space-y-2 lg:hidden">
          <Skeleton className="h-10 w-full rounded-lg" />
          <div className="flex gap-2">
            <Skeleton className="h-9 flex-1 rounded-lg" />
            <Skeleton className="h-9 flex-1 rounded-lg" />
          </div>
        </div>
      </div>

      {/* Mobile: cards */}
      <div className="lg:hidden divide-y divide-border">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="flex items-center gap-3 px-4 py-3">
            <Skeleton className="h-9 w-9 rounded-full shrink-0" />
            <div className="flex-1 space-y-2 min-w-0">
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-3 w-1/3" />
            </div>
            <Skeleton className="h-4 w-20 shrink-0" />
          </div>
        ))}
      </div>

      {/* Desktop: table */}
      <div className="hidden lg:block overflow-x-auto">
        <div className="border-b border-border bg-muted/30 px-8 py-2.5 flex gap-8">
          <Skeleton className="h-3 w-12" />
          <Skeleton className="h-3 w-32" />
          <Skeleton className="h-3 w-20" />
          <Skeleton className="h-3 w-16" />
          <Skeleton className="ml-auto h-3 w-20" />
        </div>
        {Array.from({ length: 10 }).map((_, i) => (
          <div key={i} className="flex items-center gap-6 border-b border-border px-8 py-3">
            <Skeleton className="h-3 w-14 shrink-0" />
            <div className="flex flex-1 items-center gap-2.5">
              <Skeleton className="h-7 w-7 rounded-full shrink-0" />
              <Skeleton className="h-4 w-52" />
            </div>
            <Skeleton className="h-5 w-24 rounded-full" />
            <Skeleton className="h-3 w-14" />
            <Skeleton className="ml-auto h-4 w-24" />
          </div>
        ))}
      </div>
    </div>
  );
}
