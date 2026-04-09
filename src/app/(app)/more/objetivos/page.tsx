'use client';

import { Target } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { formatCurrency } from '@/lib/utils/format';
import { useGoals } from '@/hooks/use-goals';

function formatDate(d: string) {
  const [y, m, day] = d.split('-');
  return `${day}/${m}/${y}`;
}

export default function ObjetivosPage() {
  const { data: goals, isLoading, markComplete: hookMarkComplete, remove: hookRemove } = useGoals();

  const markComplete = async (id: string) => {
    try {
      await hookMarkComplete(id);
      toast.success('Objetivo concluído!');
    } catch {
      toast.error('Erro ao concluir objetivo');
    }
  };

  const remove = async (id: string) => {
    try {
      await hookRemove(id);
      toast.success('Objetivo excluído');
    } catch {
      toast.error('Erro ao excluir objetivo');
    }
  };

  if (isLoading) {
    return (
      <div className="p-4 space-y-3">
        <h1 className="text-lg font-semibold">Objetivos</h1>
        {Array.from({ length: 2 }).map((_, i) => <Skeleton key={i} className="h-28 w-full rounded-xl" />)}
      </div>
    );
  }

  const active = goals.filter((g) => g.status === 'active');
  const done = goals.filter((g) => g.status !== 'active');

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold">Objetivos</h1>
      </div>

      {active.length === 0 && done.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-2 py-10 text-center text-muted-foreground">
          <Target className="h-10 w-10 opacity-30" />
          <p className="text-sm font-medium">Nenhum objetivo definido</p>
          <p className="text-xs">Crie metas financeiras para acompanhar seu progresso.</p>
          <p className="text-xs mt-1">Dica: use o Chat IA (Pro) para criar objetivos conversando.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {active.map((goal) => {
            const pct = Math.min(100, Math.round((goal.current_amount / goal.target_amount) * 100));
            return (
              <Card key={goal.id} className="p-4 space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <p className="text-sm font-medium">{goal.name}</p>
                  <span className="text-xs text-muted-foreground shrink-0">Prazo: {formatDate(goal.deadline)}</span>
                </div>
                <Progress value={pct} />
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">{formatCurrency(goal.current_amount)} economizado</span>
                  <span className="font-medium">{pct}% de {formatCurrency(goal.target_amount)}</span>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" className="flex-1 h-7 text-xs" onClick={() => void markComplete(goal.id)}>
                    Concluir
                  </Button>
                  <Button size="sm" variant="ghost" className="flex-1 h-7 text-xs text-destructive" onClick={() => void remove(goal.id)}>
                    Excluir
                  </Button>
                </div>
              </Card>
            );
          })}
          {done.length > 0 && (
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-2">Concluídos</p>
              {done.map((goal) => (
                <Card key={goal.id} className="p-3 opacity-60">
                  <p className="text-sm font-medium line-through">{goal.name}</p>
                  <p className="text-xs text-muted-foreground">{formatCurrency(goal.target_amount)}</p>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
