'use client';

import dynamic from 'next/dynamic';
import { Skeleton } from '@/components/ui/skeleton';

// Recharts (~400KB) loaded lazily — not in the critical render path
export const SpendingChartLazy = dynamic(
  () => import('@/components/dashboard/spending-chart').then((m) => m.SpendingChart),
  { ssr: false, loading: () => <Skeleton className="h-48 w-full rounded-xl" /> },
);

export const CategoryChartLazy = dynamic(
  () => import('@/components/dashboard/category-chart').then((m) => m.CategoryChart),
  { ssr: false, loading: () => <Skeleton className="h-48 w-full rounded-xl" /> },
);
