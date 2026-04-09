'use client';

import { toast } from 'sonner';
import { CalendarClock } from 'lucide-react';
import { ScheduledItem } from '@/components/financeiro/scheduled-item';
import { Skeleton } from '@/components/ui/skeleton';
import { useScheduledTransactions } from '@/hooks/use-scheduled-transactions';

interface ScheduledListProps {
  filter?: 'pending' | 'paid' | 'all';
  from?: string;
  to?: string;
}

export function ScheduledList({ filter = 'pending', from, to }: ScheduledListProps) {
  const status = filter === 'all' ? undefined : filter;

  const { data, isLoading, error, markPaid, cancel, remove } = useScheduledTransactions({
    status,
    from,
    to,
  });

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
      <div className="space-y-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-16 w-full rounded-lg" />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-lg border border-destructive/20 bg-destructive/5 p-4 text-center text-sm text-destructive">
        {error}
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-2 py-10 text-center text-muted-foreground">
        <CalendarClock className="h-10 w-10 opacity-30" />
        <p className="text-sm font-medium">Nenhum agendamento encontrado</p>
        <p className="text-xs">Crie contas a pagar ou receber para acompanhar seus compromissos financeiros.</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {data.map((item) => (
        <ScheduledItem
          key={item.id}
          item={item}
          onMarkPaid={(id) => void handleMarkPaid(id)}
          onCancel={(id) => void handleCancel(id)}
          onDelete={(id) => void handleDelete(id)}
        />
      ))}
    </div>
  );
}
