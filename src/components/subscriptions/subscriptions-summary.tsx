'use client';

import { CreditCard, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { formatCurrency } from '@/lib/utils/format';
import { SubscriptionCard } from '@/components/subscriptions/subscription-card';
import { useSubscriptions } from '@/hooks/use-subscriptions';

export function SubscriptionsSummary() {
  const { subscriptions, total_monthly, isLoading, error, dismiss, refresh } = useSubscriptions();

  if (isLoading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-20 w-full rounded-xl" />
        <Skeleton className="h-20 w-full rounded-xl" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-xl border border-border bg-muted/40 p-4 text-center">
        <p className="text-sm text-muted-foreground">Erro ao carregar assinaturas</p>
        <Button variant="ghost" size="sm" className="mt-2" onClick={() => void refresh()}>
          Tentar novamente
        </Button>
      </div>
    );
  }

  if (subscriptions.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-2 py-10 text-center text-muted-foreground">
        <CreditCard className="h-10 w-10 opacity-30" />
        <p className="text-sm font-medium">Nenhuma assinatura detectada</p>
        <p className="text-xs max-w-xs">
          O sistema analisa débitos recorrentes dos últimos 6 meses. Apenas transações de débito em
          conta corrente são monitoradas.
        </p>
      </div>
    );
  }

  const monthlyCount = subscriptions.filter((s) => s.frequency === 'monthly').length;
  const annualCount = subscriptions.filter((s) => s.frequency === 'annual').length;

  return (
    <div className="space-y-4">
      {/* Total bar */}
      <div className="flex items-center justify-between rounded-xl border border-border bg-muted/40 px-4 py-3">
        <div>
          <p className="text-xs text-muted-foreground">Total mensal em assinaturas</p>
          <p className="text-lg font-bold text-foreground">{formatCurrency(total_monthly)}</p>
        </div>
        <div className="text-right text-xs text-muted-foreground">
          {monthlyCount > 0 && (
            <p>{monthlyCount} mensal{monthlyCount !== 1 ? 'is' : ''}</p>
          )}
          {annualCount > 0 && (
            <p>{annualCount} anual{annualCount !== 1 ? 'is' : ''}</p>
          )}
        </div>
      </div>

      {/* List */}
      <div className="space-y-3 lg:grid lg:grid-cols-2 lg:gap-3 lg:space-y-0">
        {subscriptions.map((sub) => (
          <SubscriptionCard
            key={sub.id}
            subscription={sub}
            onDismiss={dismiss}
          />
        ))}
      </div>

      <Button
        variant="ghost"
        size="sm"
        className="w-full text-xs text-muted-foreground"
        onClick={() => void refresh()}
      >
        <RefreshCw className="mr-1.5 h-3 w-3" />
        Atualizar lista
      </Button>
    </div>
  );
}
