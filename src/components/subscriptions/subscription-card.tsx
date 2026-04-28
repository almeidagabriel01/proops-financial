'use client';

import { useState } from 'react';
import { TrendingUp, X, Calendar, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { formatCurrency } from '@/lib/utils/format';
import type { Subscription } from '@/hooks/use-subscriptions';

interface SubscriptionCardProps {
  subscription: Subscription;
  onDismiss: (id: string) => Promise<void>;
}

export function SubscriptionCard({ subscription: sub, onDismiss }: SubscriptionCardProps) {
  const [dismissing, setDismissing] = useState(false);

  const frequencyLabel = sub.frequency === 'monthly' ? 'mensal' : 'anual';
  const monthlyEquivalent =
    sub.frequency === 'annual' ? sub.current_amount / 12 : sub.current_amount;

  async function handleDismiss() {
    setDismissing(true);
    try {
      await onDismiss(sub.id);
    } catch (err) {
      console.error('[SubscriptionCard] dismiss error:', err);
    } finally {
      setDismissing(false);
    }
  }

  return (
    <div className="relative rounded-xl border border-border bg-card p-4">
      {/* Price change badge */}
      {sub.price_change_detected && (
        <div className="mb-2 flex items-center gap-1.5 text-xs font-medium text-red-600 dark:text-red-400">
          <TrendingUp className="h-3.5 w-3.5 shrink-0" />
          <span>
            Reajuste detectado
            {sub.previous_amount != null && (
              <> · antes {formatCurrency(sub.previous_amount)}</>
            )}
          </span>
        </div>
      )}

      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="truncate font-semibold text-foreground">{sub.display_name}</p>
          <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
            <span className="flex items-center gap-1 capitalize">
              <RefreshCw className="h-3 w-3" />
              {frequencyLabel}
            </span>
            <span className="flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              {sub.occurrence_count}× detectado
            </span>
          </div>
        </div>

        <div className="flex shrink-0 flex-col items-end gap-1">
          <span className="text-base font-bold text-foreground">
            {formatCurrency(sub.current_amount)}
          </span>
          {sub.frequency === 'annual' && (
            <span className="text-xs text-muted-foreground">
              ≈ {formatCurrency(monthlyEquivalent)}/mês
            </span>
          )}
        </div>
      </div>

      <Button
        variant="ghost"
        size="sm"
        className="absolute right-2 top-2 h-7 w-7 p-0 text-muted-foreground hover:text-foreground"
        disabled={dismissing}
        onClick={() => void handleDismiss()}
        aria-label="Descartar assinatura"
      >
        <X className="h-3.5 w-3.5" />
      </Button>
    </div>
  );
}
