'use client';

import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { useTheme } from 'next-themes';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatCurrency, type WeekData } from '@/lib/utils/format';

function CustomTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: Array<{ name: string; value: number; color: string }>;
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl border border-border bg-card/95 p-3 shadow-lg backdrop-blur-sm">
      <p className="mb-2 text-xs font-semibold text-muted-foreground">{label}</p>
      {payload.map((p) => (
        <div key={p.name} className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full flex-shrink-0" style={{ background: p.color }} />
          <span className="text-xs text-foreground">
            {p.name === 'receitas' ? 'Receitas' : 'Despesas'}: {formatCurrency(p.value)}
          </span>
        </div>
      ))}
    </div>
  );
}

export function SpendingChart({ data }: { data: WeekData[] }) {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === 'dark';

  // Literal color values — CSS vars don't resolve inside SVG attributes
  const tickColor = isDark ? '#8d9ab0' : '#6b7a94';
  const gridColor = isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)';

  if (!data.length) return null;

  return (
    <Card className="lg:shadow-[var(--shadow-elevated)]">
      <CardHeader className="pb-1 pt-4">
        <CardTitle className="text-base font-semibold text-foreground">
          Receitas vs Despesas
        </CardTitle>
        <p className="text-xs text-muted-foreground">Evolução semanal do período</p>
      </CardHeader>
      <CardContent className="px-2 pb-4">
        <ResponsiveContainer width="100%" height={190}>
          <AreaChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="gradReceitas" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#16a34a" stopOpacity={0.2} />
                <stop offset="100%" stopColor="#16a34a" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="gradDespesas" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#dc2626" stopOpacity={0.2} />
                <stop offset="100%" stopColor="#dc2626" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid
              strokeDasharray="3 3"
              stroke={gridColor}
              vertical={false}
            />
            <XAxis
              dataKey="week"
              tick={{ fontSize: 11, fill: tickColor }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              tick={{ fontSize: 10, fill: tickColor }}
              axisLine={false}
              tickLine={false}
              width={52}
              tickFormatter={(v: number) =>
                v >= 1000 ? `${(v / 1000).toFixed(0)}k` : `${v}`
              }
            />
            <Tooltip
              content={<CustomTooltip />}
              cursor={{ stroke: gridColor, strokeWidth: 1, strokeDasharray: '4 2' }}
            />
            <Area
              type="monotone"
              dataKey="receitas"
              stroke="#16a34a"
              strokeWidth={2}
              fill="url(#gradReceitas)"
              dot={false}
              activeDot={{ r: 4, fill: '#16a34a', strokeWidth: 0 }}
            />
            <Area
              type="monotone"
              dataKey="despesas"
              stroke="#dc2626"
              strokeWidth={2}
              fill="url(#gradDespesas)"
              dot={false}
              activeDot={{ r: 4, fill: '#dc2626', strokeWidth: 0 }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
