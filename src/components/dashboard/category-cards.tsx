'use client';

import { useRouter } from 'next/navigation';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { CATEGORY_CONFIG } from '@/lib/utils/categories';
import { formatCurrency } from '@/lib/utils/format';
import type { Category } from '@/lib/billing/plans';
import type { CategoryBreakdown, TrendResult } from '@/lib/utils/category-aggregation';

interface CategoryCardsProps {
  data: CategoryBreakdown[];
}

function TrendBadge({ trend }: { trend: TrendResult | null }) {
  if (!trend) return null;
  if (trend.direction === 'stable') {
    return <Minus className="h-3 w-3 text-muted-foreground" />;
  }
  if (trend.direction === 'up') {
    return (
      <span className="flex items-center gap-0.5 text-[10px] text-red-500">
        <TrendingUp className="h-3 w-3" />
        {trend.percentage}%
      </span>
    );
  }
  return (
    <span className="flex items-center gap-0.5 text-[10px] text-green-600">
      <TrendingDown className="h-3 w-3" />
      {trend.percentage}%
    </span>
  );
}

export function CategoryCards({ data }: CategoryCardsProps) {
  const router = useRouter();

  if (!data.length) return null;

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
      {data.map((item) => {
        const config = CATEGORY_CONFIG[item.category as Category] ?? CATEGORY_CONFIG.outros;
        const Icon = config.icon;

        return (
          <Card
            key={item.category}
            className="cursor-pointer transition-colors hover:bg-accent"
            onClick={() => router.push(`/transactions?category=${item.category}`)}
            role="button"
            aria-label={`Ver transações de ${config.label}`}
          >
            <CardContent className="p-3">
              <div className="flex items-center justify-between">
                <div
                  className="flex h-8 w-8 items-center justify-center rounded-lg"
                  style={{ backgroundColor: `${config.color}20` }}
                >
                  <Icon className="h-4 w-4" style={{ color: config.color }} />
                </div>
                <TrendBadge trend={item.trend} />
              </div>
              <div className="mt-2">
                <p className="text-xs text-muted-foreground">{config.label}</p>
                <p className="mt-0.5 text-sm font-semibold text-foreground">
                  {formatCurrency(item.total)}
                </p>
                <p className="text-[10px] text-muted-foreground">
                  {item.percentage}% · {item.count} transaç{item.count === 1 ? 'ão' : 'ões'}
                </p>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

export function CategoryCardsSkeleton() {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
      {Array.from({ length: 6 }).map((_, i) => (
        <Card key={i}>
          <CardContent className="p-3">
            <div className="flex items-center justify-between">
              <Skeleton className="h-8 w-8 rounded-lg" />
            </div>
            <div className="mt-2 space-y-1.5">
              <Skeleton className="h-3 w-16" />
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-3 w-12" />
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
