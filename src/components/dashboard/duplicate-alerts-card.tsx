'use client';

import { useState } from 'react';
import { AlertTriangle, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { formatCurrency, formatDate } from '@/lib/utils/format';

export interface DuplicateAlertTransaction {
  id: string;
  date: string;
  description: string;
  amount: number;
}

export interface DuplicateAlert {
  id: string;
  status: 'pending' | 'dismissed';
  t1: DuplicateAlertTransaction;
  t2: DuplicateAlertTransaction;
}

interface DuplicateAlertsCardProps {
  initialAlerts: DuplicateAlert[];
}

const MAX_VISIBLE = 3;

export function DuplicateAlertsCard({ initialAlerts }: DuplicateAlertsCardProps) {
  const [alerts, setAlerts] = useState<DuplicateAlert[]>(initialAlerts);
  const [dismissing, setDismissing] = useState<Set<string>>(new Set());

  // Card only renders when there are pending alerts
  if (alerts.length === 0) return null;

  const visible = alerts.slice(0, MAX_VISIBLE);
  const overflowCount = alerts.length - MAX_VISIBLE;

  async function handleDismiss(alertId: string) {
    setDismissing((prev) => new Set(prev).add(alertId));

    try {
      const res = await fetch(`/api/duplicate-alerts/${alertId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'dismissed' }),
      });

      if (!res.ok) {
        console.error('[DuplicateAlertsCard] dismiss failed:', await res.text());
        return;
      }

      // Remove dismissed alert from local state
      setAlerts((prev) => prev.filter((a) => a.id !== alertId));
    } catch (err) {
      console.error('[DuplicateAlertsCard] dismiss error:', err);
    } finally {
      setDismissing((prev) => {
        const next = new Set(prev);
        next.delete(alertId);
        return next;
      });
    }
  }

  return (
    <div className="rounded-xl border border-amber-300 bg-amber-50 p-4 dark:border-amber-700/60 dark:bg-amber-950/20">
      <div className="mb-3 flex items-center gap-2">
        <AlertTriangle className="h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" />
        <p className="text-sm font-semibold text-amber-800 dark:text-amber-300">
          Possível cobrança duplicada
        </p>
      </div>

      <div className="space-y-3">
        {visible.map((alert) => (
          <div
            key={alert.id}
            className="rounded-lg border border-amber-200 bg-white px-3 py-2.5 dark:border-amber-800/40 dark:bg-amber-950/30"
          >
            <div className="mb-2 space-y-1">
              <DuplicateTransactionRow tx={alert.t1} />
              <DuplicateTransactionRow tx={alert.t2} />
            </div>
            <Button
              variant="outline"
              size="sm"
              className="h-7 border-amber-300 text-xs text-amber-700 hover:bg-amber-100 dark:border-amber-700 dark:text-amber-400 dark:hover:bg-amber-900/40"
              disabled={dismissing.has(alert.id)}
              onClick={() => void handleDismiss(alert.id)}
            >
              <X className="mr-1 h-3 w-3" />
              Não é duplicata
            </Button>
          </div>
        ))}
      </div>

      {overflowCount > 0 && (
        <p className="mt-2 text-xs text-amber-600 dark:text-amber-400">
          +{overflowCount} alerta{overflowCount > 1 ? 's' : ''} — verifique em Transações
        </p>
      )}
    </div>
  );
}

function DuplicateTransactionRow({ tx }: { tx: DuplicateAlertTransaction }) {
  return (
    <div className="flex items-center justify-between gap-2 text-xs">
      <span className="truncate text-muted-foreground">{formatDate(tx.date)}</span>
      <span className="min-w-0 flex-1 truncate font-medium text-foreground">{tx.description}</span>
      <span className="shrink-0 font-semibold text-red-600 dark:text-red-400">
        -{formatCurrency(Math.abs(tx.amount))}
      </span>
    </div>
  );
}
