'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CATEGORY_CONFIG } from '@/lib/utils/categories';
import { formatCurrency } from '@/lib/utils/format';
import type { Category } from '@/lib/billing/plans';
import type { CategoryData } from '@/lib/utils/category-aggregation';

interface CategoryChartProps {
  data: CategoryData[];
}

export function CategoryChart({ data }: CategoryChartProps) {
  if (!data.length) return null;

  const top5 = data.slice(0, 5);
  const maxVal = top5[0]?.total ?? 1;

  return (
    <Card className="lg:shadow-[var(--shadow-elevated)]">
      <CardHeader className="pb-3 pt-4">
        <CardTitle className="text-base font-semibold text-foreground">
          Distribuição de Gastos
        </CardTitle>
        <p className="text-xs text-muted-foreground">Top {top5.length} categorias do período</p>
      </CardHeader>
      <CardContent className="space-y-4 pb-4">
        {top5.map((d) => {
          const config = CATEGORY_CONFIG[d.category as Category] ?? CATEGORY_CONFIG.outros;
          const Icon = config.icon;
          const barPct = Math.round((d.total / maxVal) * 100);

          return (
            <div key={d.category} className="space-y-1.5">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2 min-w-0">
                  <div
                    className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md"
                    style={{ background: `${config.color}22` }}
                  >
                    <Icon className="h-3.5 w-3.5 shrink-0" style={{ color: config.color }} />
                  </div>
                  <span className="text-xs font-medium text-foreground truncate">
                    {config.label}
                  </span>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-[11px] text-muted-foreground">{d.percentage}%</span>
                  <span className="text-xs font-semibold text-foreground tabular-nums">
                    {formatCurrency(d.total)}
                  </span>
                </div>
              </div>
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted/50">
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{ width: `${barPct}%`, background: config.color }}
                />
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
