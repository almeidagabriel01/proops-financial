'use client';

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  ResponsiveContainer,
  Cell,
  Tooltip,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CATEGORY_CONFIG } from '@/lib/utils/categories';
import { formatCurrency } from '@/lib/utils/format';
import type { Category } from '@/lib/billing/plans';
import type { CategoryData } from '@/lib/utils/category-aggregation';

const MAX_BARS = 6;

interface SpendingBreakdownProps {
  data: CategoryData[];
}

function CustomTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: Array<{ payload: CategoryData & { fill: string } }>;
}) {
  if (!active || !payload?.length) return null;
  const entry = payload[0].payload;
  const config = CATEGORY_CONFIG[entry.category as Category] ?? CATEGORY_CONFIG.outros;
  return (
    <div className="rounded-lg border border-border bg-card p-3 shadow-md">
      <p className="text-xs font-medium text-foreground">{config.label}</p>
      <p className="mt-0.5 text-xs text-muted-foreground">{formatCurrency(entry.total)}</p>
    </div>
  );
}

export function SpendingBreakdown({ data }: SpendingBreakdownProps) {
  if (!data.length) return null;

  const top = data.slice(0, MAX_BARS);
  const others = data.slice(MAX_BARS);

  const chartData = top.map((d) => ({
    ...d,
    fill: CATEGORY_CONFIG[d.category as Category]?.color ?? '#9ca3af',
    name: CATEGORY_CONFIG[d.category as Category]?.label ?? d.category,
  }));

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          Maiores categorias de gasto
          {others.length > 0 && (
            <span className="ml-2 text-xs font-normal text-muted-foreground/70">
              (e outras {others.length})
            </span>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="px-2 pb-4">
        <ResponsiveContainer width="100%" height={Math.max(top.length * 40, 120)}>
          <BarChart
            data={chartData}
            layout="vertical"
            margin={{ top: 0, right: 60, left: 8, bottom: 0 }}
          >
            <XAxis type="number" hide />
            <YAxis
              type="category"
              dataKey="name"
              tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
              axisLine={false}
              tickLine={false}
              width={88}
            />
            <Tooltip content={<CustomTooltip />} cursor={{ fill: 'hsl(var(--muted)/0.3)' }} />
            <Bar dataKey="total" radius={[0, 4, 4, 0]} maxBarSize={20} label={{ position: 'right', fontSize: 10, formatter: (v: unknown) => formatCurrency(typeof v === 'number' ? v : 0) }}>
              {chartData.map((entry) => (
                <Cell key={entry.category} fill={entry.fill} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
