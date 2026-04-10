import { Skeleton } from '@/components/ui/skeleton';

export default function ContasLoading() {
  return (
    <div className="p-4 space-y-4 lg:px-8 lg:py-6">
      <div className="flex items-center justify-between">
        <Skeleton className="h-8 w-40" />
        <Skeleton className="h-9 w-36 rounded-xl" />
      </div>
      <Skeleton className="h-24 rounded-xl" />
      <div className="flex gap-2">
        <Skeleton className="h-8 w-24 rounded-lg" />
        <Skeleton className="h-8 w-24 rounded-lg" />
      </div>
      <div className="space-y-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-16 rounded-xl" />
        ))}
      </div>
    </div>
  );
}
