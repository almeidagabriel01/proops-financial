'use client';

import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
} from 'recharts';
import { formatCurrency } from '@/lib/utils/format';

export interface CashFlowPoint {
  date: string;
  balance: number;
  inflow: number;
  outflow: number;
}

interface TooltipPayload {
  value: number;
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: TooltipPayload[];
  label?: string;
}

function CustomTooltip({ active, payload, label }: CustomTooltipProps) {
  if (!active || !payload?.length) return null;
  const balance = payload[0]?.value ?? 0;
  return (
    <div className="rounded-lg border border-border bg-background px-3 py-2 text-xs shadow-lg">
      <p className="font-medium text-foreground">{label}</p>
      <p className={balance >= 0 ? 'text-green-600 dark:text-green-400' : 'text-destructive'}>
        {formatCurrency(balance)}
      </p>
    </div>
  );
}

function formatAxisDate(dateStr: string): string {
  const [, m, d] = dateStr.split('-');
  const months = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
  return `${parseInt(d, 10)} ${months[parseInt(m, 10) - 1]}`;
}

interface CashFlowChartProps {
  data: CashFlowPoint[];
  className?: string;
}

export function CashFlowChart({ data, className }: CashFlowChartProps) {
  if (data.length === 0) return null;

  const hasNegative = data.some((p) => p.balance < 0);
  const minBalance = Math.min(...data.map((p) => p.balance));
  const maxBalance = Math.max(...data.map((p) => p.balance));
  const padding = (maxBalance - minBalance) * 0.1;

  // Show fewer x-axis labels when there are many points
  const tickInterval = data.length > 60 ? Math.floor(data.length / 8) : data.length > 30 ? 6 : 3;

  const chartData = data.map((p) => ({
    ...p,
    label: formatAxisDate(p.date),
  }));

  return (
    <div className={className} style={{ width: '100%', height: 200 }}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={chartData} margin={{ top: 8, right: 4, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="balanceGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%"  stopColor="hsl(var(--primary))" stopOpacity={0.3} />
              <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
            </linearGradient>
            {hasNegative && (
              <linearGradient id="negativeGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%"  stopColor="hsl(var(--destructive))" stopOpacity={0.25} />
                <stop offset="95%" stopColor="hsl(var(--destructive))" stopOpacity={0} />
              </linearGradient>
            )}
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
          <XAxis
            dataKey="label"
            tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
            tickLine={false}
            axisLine={false}
            interval={tickInterval}
          />
          <YAxis
            tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
            tickLine={false}
            axisLine={false}
            tickFormatter={(v: number) => {
              if (Math.abs(v) >= 1000) return `R$${(v / 1000).toFixed(0)}k`;
              return `R$${v.toFixed(0)}`;
            }}
            domain={[minBalance - padding, maxBalance + padding]}
            width={48}
          />
          <Tooltip content={<CustomTooltip />} />
          {hasNegative && <ReferenceLine y={0} stroke="hsl(var(--destructive))" strokeDasharray="4 2" strokeWidth={1} />}
          <Area
            type="monotone"
            dataKey="balance"
            stroke="hsl(var(--primary))"
            strokeWidth={2}
            fill="url(#balanceGradient)"
            dot={false}
            activeDot={{ r: 4, strokeWidth: 0 }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
