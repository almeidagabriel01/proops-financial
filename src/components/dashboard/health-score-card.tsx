'use client';

import { useEffect, useState } from 'react';
import {
  LineChart,
  Line,
  ResponsiveContainer,
  Tooltip as RechartsTooltip,
} from 'recharts';
import { Tooltip } from '@base-ui/react/tooltip';
import { Skeleton } from '@/components/ui/skeleton';
import { BADGE_CONFIG, type Badge } from '@/lib/health-score/calculate';

interface ScoreResponse {
  score: number | null;
  badge: Badge | null;
  components: {
    savingsRate: number;
    budgetCompliance: number;
    goalsProgress: number;
    diversification: number;
  } | null;
  month: string;
}

interface HistoryEntry {
  month: string;
  score: number;
}

interface HealthScoreCardProps {
  month: string; // "YYYY-MM" — passed from Server Component; drives refetch on change
}

export function HealthScoreCard({ month }: HealthScoreCardProps) {
  const [scoreData, setScoreData] = useState<ScoreResponse | null>(null);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      try {
        const [scoreRes, histRes] = await Promise.all([
          fetch(`/api/health-score?month=${month}`).then((r) => r.json()),
          fetch('/api/health-score/history').then((r) => r.json()),
        ]);
        if (!cancelled) {
          setScoreData(scoreRes as ScoreResponse);
          setHistory((histRes as { data: HistoryEntry[] }).data ?? []);
          setLoading(false);
        }
      } catch {
        if (!cancelled) setLoading(false);
      }
    }

    void load();
    return () => { cancelled = true; };
  }, [month]);

  if (loading) {
    return (
      <div className="rounded-xl border border-border bg-card p-4 lg:shadow-[var(--shadow-elevated)] lg:p-5">
        <Skeleton className="mb-3 h-4 w-32" />
        <div className="flex items-center gap-4">
          <Skeleton className="h-14 w-14 rounded-full" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-5 w-24" />
            <Skeleton className="h-3 w-full" />
          </div>
        </div>
      </div>
    );
  }

  if (!scoreData || scoreData.score === null) {
    return (
      <div className="rounded-xl border border-border bg-card p-4 lg:shadow-[var(--shadow-elevated)] lg:p-5">
        <p className="text-sm font-semibold text-foreground">Score de Saúde Financeira</p>
        <p className="mt-2 text-sm text-muted-foreground">
          Importe transações para ver seu score de saúde.
        </p>
      </div>
    );
  }

  const { score, badge, components } = scoreData;
  const badgeConfig = badge ? BADGE_CONFIG[badge] : null;
  const lineColor =
    badge === 'excelente'
      ? '#22c55e'
      : badge === 'bom'
        ? '#3b82f6'
        : badge === 'regular'
          ? '#f97316'
          : '#ef4444';

  return (
    <Tooltip.Provider>
      <div className="rounded-xl border border-border bg-card p-4 lg:shadow-[var(--shadow-elevated)] lg:p-5">
        <p className="mb-3 text-sm font-semibold text-foreground">Score de Saúde Financeira</p>

        <div className="flex items-start gap-4">
          {/* Score + badge */}
          <div className="flex flex-col items-center gap-1.5">
            <Tooltip.Root>
              <Tooltip.Trigger
                className="flex h-16 w-16 cursor-default items-center justify-center rounded-full border-2 text-2xl font-bold"
                style={{ borderColor: lineColor, color: lineColor }}
                aria-label={`Score de saúde: ${score} de 100`}
              >
                {score}
              </Tooltip.Trigger>
              {components && (
                <Tooltip.Portal>
                  <Tooltip.Positioner side="right">
                    <Tooltip.Popup className="z-50 rounded-lg border border-border bg-popover px-3 py-2 text-xs shadow-md">
                      <p className="mb-1 font-semibold text-foreground">Componentes</p>
                      <p className="text-muted-foreground">Taxa de poupança: {components.savingsRate} pts</p>
                      <p className="text-muted-foreground">Orçamentos cumpridos: {components.budgetCompliance} pts</p>
                      <p className="text-muted-foreground">Progresso de metas: {components.goalsProgress} pts</p>
                      <p className="text-muted-foreground">Diversificação: {components.diversification} pts</p>
                    </Tooltip.Popup>
                  </Tooltip.Positioner>
                </Tooltip.Portal>
              )}
            </Tooltip.Root>

            {badgeConfig && (
              <span
                className={`rounded-full border px-2 py-0.5 text-[11px] font-semibold ${badgeConfig.color}`}
              >
                {badgeConfig.label}
              </span>
            )}
          </div>

          {/* Mini line chart */}
          {history.length >= 2 ? (
            <div className="flex-1">
              <p className="mb-1 text-[11px] text-muted-foreground">Últimos {history.length} meses</p>
              <ResponsiveContainer width="100%" height={60}>
                <LineChart data={history} margin={{ top: 4, right: 4, bottom: 4, left: 4 }}>
                  <Line
                    type="monotone"
                    dataKey="score"
                    stroke={lineColor}
                    strokeWidth={2}
                    dot={false}
                    isAnimationActive={false}
                  />
                  <RechartsTooltip
                    formatter={(value) => [`${value ?? ''}`, 'Score']}
                    labelFormatter={(label) => String(label)}
                    contentStyle={{ fontSize: '11px' }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="flex flex-1 items-center">
              <p className="text-xs text-muted-foreground">
                Histórico disponível após o primeiro mês fechado.
              </p>
            </div>
          )}
        </div>
      </div>
    </Tooltip.Provider>
  );
}
