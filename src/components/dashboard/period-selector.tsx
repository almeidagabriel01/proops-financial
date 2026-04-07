'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

type DashboardPeriod = 'current' | 'previous';

export function PeriodSelector() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const period = (searchParams.get('period') ?? 'current') as DashboardPeriod;

  function handleChange(value: DashboardPeriod | null) {
    if (!value) return;
    const params = new URLSearchParams(searchParams.toString());
    if (value === 'current') {
      params.delete('period');
    } else {
      params.set('period', value);
    }
    router.push(`/dashboard${params.size ? '?' + params.toString() : ''}`, { scroll: false });
  }

  return (
    <Select value={period} onValueChange={handleChange}>
      <SelectTrigger className="h-8 w-36 text-xs">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="current">Mês atual</SelectItem>
        <SelectItem value="previous">Mês anterior</SelectItem>
      </SelectContent>
    </Select>
  );
}
