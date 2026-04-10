'use client';

import { useMemo, useState } from 'react';
import { TrendingDown, TrendingUp, Scale, CalendarClock } from 'lucide-react';
import { toast } from 'sonner';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { ScheduledItem } from '@/components/financeiro/scheduled-item';
import { useScheduledTransactions } from '@/hooks/use-scheduled-transactions';
import { formatCurrency } from '@/lib/utils/format';

function addDays(dateStr: string, days: number): string {
  const d = new Date(dateStr + 'T12:00:00Z');
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

function formatMonthGroup(dateStr: string): string {
  const [y, m] = dateStr.split('-');
  const months = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
  return `${months[parseInt(m, 10) - 1]} ${y}`;
}

const HORIZON_OPTIONS = [
  { label: '30 dias', days: 30 },
  { label: '60 dias', days: 60 },
  { label: '90 dias', days: 90 },
];

export default function FluxoPage() {
  const [horizon, setHorizon] = useState(30);
  const today = new Date().toISOString().slice(0, 10);
  const endDate = addDays(today, horizon);

  const { data, isLoading, error, markPaid, cancel, remove } = useScheduledTransactions({
    from: today,
    to: endDate,
  });

  const grouped = useMemo(() => {
    const map = new Map<string, typeof data>();
    for (const item of data) {
      const key = item.due_date.slice(0, 7);
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(item);
    }
    return Array.from(map.entries()).sort(([a], [b]) => a.localeCompare(b));
  }, [data]);

  const totals = useMemo(() => {
    const pending = data.filter((i) => i.status === 'pending' || i.status === 'overdue');
    const aPagar = pending.filter((i) => i.type === 'debit').reduce((s, i) => s + i.amount, 0);
    const aReceber = pending.filter((i) => i.type === 'credit').reduce((s, i) => s + i.amount, 0);
    return { aPagar, aReceber, saldo: aReceber - aPagar };
  }, [data]);

  const handleMarkPaid = async (id: string) => {
    try {
      await markPaid(id);
      toast.success('Marcado como pago!');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Erro ao marcar como pago');
    }
  };

  const handleCancel = async (id: string) => {
    try {
      await cancel(id);
      toast.success('Agendamento cancelado');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Erro ao cancelar');
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await remove(id);
      toast.success('Agendamento excluído');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Erro ao excluir');
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-3">
        <h1 className="text-lg font-semibold lg:text-2xl lg:font-bold">Fluxo de Caixa</h1>
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-16 w-full rounded-xl" />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-3">
        <h1 className="text-lg font-semibold lg:text-2xl lg:font-bold">Fluxo de Caixa</h1>
        <div className="rounded-lg border border-destructive/20 bg-destructive/5 p-4 text-sm text-destructive">{error}</div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Desktop hero */}
      <div className="hidden lg:flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Fluxo de Caixa</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Projeção dos próximos {horizon} dias
          </p>
        </div>
        {/* Horizon selector — desktop */}
        <div className="flex rounded-lg border border-border text-xs font-medium overflow-hidden">
          {HORIZON_OPTIONS.map((opt) => (
            <button
              key={opt.days}
              type="button"
              className={`px-3 py-2 transition-colors ${horizon === opt.days ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'}`}
              onClick={() => setHorizon(opt.days)}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Mobile header */}
      <div className="flex items-center justify-between lg:hidden">
        <h1 className="text-lg font-semibold">Fluxo de Caixa</h1>
        <div className="flex rounded-lg border border-border text-xs font-medium overflow-hidden">
          {HORIZON_OPTIONS.map((opt) => (
            <button
              key={opt.days}
              type="button"
              className={`px-2.5 py-1.5 transition-colors ${horizon === opt.days ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'}`}
              onClick={() => setHorizon(opt.days)}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Resumo — 3 colunas */}
      <div className="grid grid-cols-3 gap-2 lg:gap-4">
        <Card className="p-3 lg:p-5 lg:shadow-[var(--shadow-elevated)]">
          <div className="flex items-center gap-1.5">
            <TrendingDown className="h-4 w-4 shrink-0 text-destructive" />
            <span className="text-xs text-muted-foreground lg:text-sm">A Pagar</span>
          </div>
          <p className="mt-1 text-base lg:text-2xl lg:mt-2 font-semibold text-destructive">
            {formatCurrency(totals.aPagar)}
          </p>
        </Card>
        <Card className="p-3 lg:p-5 lg:shadow-[var(--shadow-elevated)]">
          <div className="flex items-center gap-1.5">
            <TrendingUp className="h-4 w-4 shrink-0 text-green-600" />
            <span className="text-xs text-muted-foreground lg:text-sm">A Receber</span>
          </div>
          <p className="mt-1 text-base lg:text-2xl lg:mt-2 font-semibold text-green-600 dark:text-green-400">
            {formatCurrency(totals.aReceber)}
          </p>
        </Card>
        <Card className="p-3 lg:p-5 lg:shadow-[var(--shadow-elevated)]">
          <div className="flex items-center gap-1.5">
            <Scale className="h-4 w-4 shrink-0 text-primary" />
            <span className="text-xs text-muted-foreground lg:text-sm">Projetado</span>
          </div>
          <p className={`mt-1 text-base lg:text-2xl lg:mt-2 font-semibold ${totals.saldo >= 0 ? 'text-green-600 dark:text-green-400' : 'text-destructive'}`}>
            {formatCurrency(totals.saldo)}
          </p>
        </Card>
      </div>

      {/* Lista agrupada por mês */}
      {grouped.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-2 py-10 text-center text-muted-foreground">
          <CalendarClock className="h-10 w-10 opacity-30" />
          <p className="text-sm font-medium">Sem movimentações nos próximos {horizon} dias</p>
          <p className="text-xs">
            Agende contas ou cadastre recorrentes para visualizar o fluxo projetado.
          </p>
        </div>
      ) : (
        grouped.map(([monthKey, items]) => (
          <div key={monthKey} className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              {formatMonthGroup(monthKey + '-01')}
            </p>
            <div className="space-y-2">
              {items.map((item) => (
                <ScheduledItem
                  key={item.id}
                  item={item}
                  onMarkPaid={() => void handleMarkPaid(item.id)}
                  onCancel={() => void handleCancel(item.id)}
                  onDelete={() => void handleDelete(item.id)}
                />
              ))}
            </div>
          </div>
        ))
      )}
    </div>
  );
}
