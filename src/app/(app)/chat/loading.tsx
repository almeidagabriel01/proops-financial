import { Skeleton } from '@/components/ui/skeleton';

export default function ChatLoading() {
  return (
    <div className="flex h-[calc(100dvh-8rem)] flex-col gap-4 px-4 py-6">
      {/* Messages skeleton */}
      <div className="flex-1 space-y-4 overflow-hidden">
        {/* Assistant message */}
        <div className="flex gap-3">
          <Skeleton className="h-8 w-8 shrink-0 rounded-full" />
          <Skeleton className="h-20 w-3/4 rounded-2xl" />
        </div>
        {/* User message */}
        <div className="flex justify-end">
          <Skeleton className="h-12 w-1/2 rounded-2xl" />
        </div>
        {/* Assistant message */}
        <div className="flex gap-3">
          <Skeleton className="h-8 w-8 shrink-0 rounded-full" />
          <Skeleton className="h-32 w-4/5 rounded-2xl" />
        </div>
      </div>

      {/* Input skeleton */}
      <Skeleton className="h-12 w-full rounded-xl" />
    </div>
  );
}
