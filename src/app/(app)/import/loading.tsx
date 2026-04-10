import { Skeleton } from '@/components/ui/skeleton';

export default function ImportLoading() {
  return (
    <div className="h-full overflow-y-auto">
      <div className="p-4 space-y-4 lg:px-8 lg:py-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-48 rounded-xl" />
      </div>
    </div>
  );
}
