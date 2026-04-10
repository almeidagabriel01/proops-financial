import { Skeleton } from '@/components/ui/skeleton';

export default function ParcelasLoading() {
  return (
    <div className="p-4 space-y-4 lg:px-8 lg:py-6">
      <Skeleton className="h-8 w-48" />
      <div className="grid grid-cols-1 gap-3 lg:grid-cols-2 lg:gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-32 rounded-xl" />
        ))}
      </div>
    </div>
  );
}
