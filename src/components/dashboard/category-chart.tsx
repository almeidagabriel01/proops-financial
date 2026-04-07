'use client';

import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CATEGORY_CONFIG } from '@/lib/utils/categories';
import { formatCurrency } from '@/lib/utils/format';
import type { Category } from '@/lib/billing/plans';
import type { CategoryData } from '@/lib/utils/category-aggregation';

interface CategoryChartProps {
  data: CategoryData[];
}

function CustomTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: Array<{ payload: CategoryData }>;
}) {
  if (!active || !payload?.length) return null;
  const entry = payload[0].payload;
  const config = CATEGORY_CONFIG[entry.category as Category] ?? CATEGORY_CONFIG.outros;
  return (
    <div className="rounded-lg border border-border bg-card p-3 shadow-md">
      <p className="text-xs font-medium text-foreground">{config.label}</p>
      <p className="mt-0.5 text-xs text-muted-foreground">{formatCurrency(entry.total)}</p>
      <p className="text-xs text-muted-foreground">{entry.percentage}% do total</p>
    </div>
  );
}

export function CategoryChart({ data }: CategoryChartProps) {
  if (!data.length) return null;

  const chartData = data.map((d) => ({
    ...d,
    fill: CATEGORY_CONFIG[d.category as Category]?.color ?? '#9ca3af',
    name: CATEGORY_CONFIG[d.category as Category]?.label ?? d.category,
  }));

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          Distribuição por categoria
        </CardTitle>
      </CardHeader>
      <CardContent className="px-2 pb-4">
        <ResponsiveContainer width="100%" height={240}>
          <PieChart>
            <Pie
              data={chartData}
              dataKey="total"
              cx="50%"
              cy="50%"
              innerRadius={55}
              outerRadius={85}
              paddingAngle={2}
            >
              {chartData.map((entry) => (
                <Cell key={entry.category} fill={entry.fill} />
              ))}
            </Pie>
            <Tooltip content={<CustomTooltip />} />
            <Legend
              formatter={(value) => (
                <span className="text-xs text-foreground">{value}</span>
              )}
              iconSize={10}
            />
          </PieChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
