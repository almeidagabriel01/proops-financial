import { Skeleton } from '@/components/ui/skeleton';

export default function SettingsLoading() {
  return (
    <div className="h-full overflow-y-auto">
      <div className="w-full px-4 py-6 pb-24 lg:px-8 lg:py-8 lg:pb-28">
        <Skeleton className="mb-6 h-8 w-48" />
        {/* Tab bar (mobile) */}
        <div className="flex gap-1 rounded-xl border border-border bg-muted/30 p-1 mb-6 lg:hidden">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-8 flex-1 rounded-lg" />
          ))}
        </div>
        <div className="space-y-4">
          <Skeleton className="h-48 rounded-xl" />
          <Skeleton className="h-32 rounded-xl" />
        </div>
      </div>
    </div>
  );
}
