import { Skeleton } from '@/components/ui/skeleton';

export default function ObjetivosLoading() {
  return (
    <div className="h-full overflow-y-auto">
      <div className="p-4 space-y-3 lg:px-8 lg:py-6">
        <div className="flex items-center justify-between">
          <Skeleton className="h-8 w-32" />
          <Skeleton className="h-9 w-36" />
        </div>
        {Array.from({ length: 2 }).map((_, i) => (
          <Skeleton key={i} className="h-36 w-full rounded-xl" />
        ))}
      </div>
    </div>
  );
}
