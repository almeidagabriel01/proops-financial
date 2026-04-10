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
import { useTheme } from 'next-themes';
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
    <div className="rounded-xl border border-border bg-card/95 p-3 shadow-lg backdrop-blur-sm">
      <p className="text-xs font-medium text-foreground">{config.label}</p>
      <p className="mt-0.5 text-xs font-semibold text-foreground">{formatCurrency(entry.total)}</p>
      <p className="text-[11px] text-muted-foreground">{entry.count} transaç{entry.count === 1 ? 'ão' : 'ões'}</p>
    </div>
  );
}

export function SpendingBreakdown({ data }: SpendingBreakdownProps) {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === 'dark';

  // Literal color values — CSS vars don't resolve inside SVG attributes
  const tickColor = isDark ? '#8d9ab0' : '#6b7a94';
  const cursorColor = isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)';

  if (!data.length) return null;

  const top = data.slice(0, MAX_BARS);
  const others = data.slice(MAX_BARS);

  const chartData = top.map((d) => ({
    ...d,
    fill: CATEGORY_CONFIG[d.category as Category]?.color ?? '#9ca3af',
    name: CATEGORY_CONFIG[d.category as Category]?.label ?? d.category,
  }));

  return (
    <Card className="h-full lg:shadow-[var(--shadow-elevated)]">
      <CardHeader className="pb-2 pt-4">
        <CardTitle className="text-base font-semibold text-foreground">
          Maiores categorias
          {others.length > 0 && (
            <span className="ml-2 text-xs font-normal text-muted-foreground">
              +{others.length} outras
            </span>
          )}
        </CardTitle>
        <p className="text-xs text-muted-foreground">Despesas por categoria no período</p>
      </CardHeader>
      <CardContent className="px-2 pb-4">
        <ResponsiveContainer width="100%" height={Math.max(top.length * 42, 140)}>
          <BarChart
            data={chartData}
            layout="vertical"
            margin={{ top: 0, right: 70, left: 8, bottom: 0 }}
          >
            <XAxis type="number" hide />
            <YAxis
              type="category"
              dataKey="name"
              tick={{ fontSize: 11, fill: tickColor }}
              axisLine={false}
              tickLine={false}
              width={88}
            />
            <Tooltip
              content={<CustomTooltip />}
              cursor={{ fill: cursorColor }}
            />
            <Bar
              dataKey="total"
              radius={[0, 4, 4, 0]}
              maxBarSize={18}
              label={{
                position: 'right',
                fontSize: 10,
                fill: tickColor,
                formatter: (v: unknown) => formatCurrency(typeof v === 'number' ? v : 0),
              }}
            >
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
