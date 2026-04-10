import { Skeleton } from '@/components/ui/skeleton';

export default function RecorrentesLoading() {
  return (
    <div className="p-4 space-y-4 lg:px-8 lg:py-6">
      <div className="flex items-center justify-between">
        <Skeleton className="h-8 w-44" />
        <Skeleton className="h-9 w-36 rounded-xl" />
      </div>
      <div className="flex gap-2">
        <Skeleton className="h-8 w-24 rounded-lg" />
        <Skeleton className="h-8 w-24 rounded-lg" />
      </div>
      <div className="grid grid-cols-1 gap-2 lg:grid-cols-2 lg:gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-24 rounded-xl" />
        ))}
      </div>
    </div>
  );
}
