import { Skeleton } from '@/components/ui/skeleton';

export default function ChatLoading() {
  return (
    <div className="flex h-full overflow-hidden">
      {/* Desktop sidebar skeleton */}
      <div className="hidden lg:flex lg:w-72 lg:shrink-0 lg:flex-col lg:border-r lg:border-border">
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-8 w-8 rounded-lg" />
        </div>
        <div className="flex-1 p-3 space-y-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="px-1 py-2 space-y-1.5">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-3 w-24" />
            </div>
          ))}
        </div>
      </div>

      {/* Chat area skeleton */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border px-4 py-3 shrink-0">
          <div className="space-y-1.5">
            <Skeleton className="h-4 w-40" />
            <Skeleton className="h-3 w-52" />
          </div>
          <div className="flex gap-1 lg:hidden">
            <Skeleton className="h-8 w-8 rounded-lg" />
            <Skeleton className="h-8 w-8 rounded-lg" />
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 space-y-4 overflow-hidden p-4">
          <div className="flex gap-3">
            <Skeleton className="h-8 w-8 shrink-0 rounded-full" />
            <Skeleton className="h-20 w-3/4 rounded-2xl" />
          </div>
          <div className="flex justify-end">
            <Skeleton className="h-12 w-1/2 rounded-2xl" />
          </div>
          <div className="flex gap-3">
            <Skeleton className="h-8 w-8 shrink-0 rounded-full" />
            <Skeleton className="h-32 w-4/5 rounded-2xl" />
          </div>
        </div>

        {/* Input */}
        <div className="shrink-0 p-4 border-t border-border">
          <Skeleton className="h-12 w-full rounded-xl" />
        </div>
      </div>
    </div>
  );
}
