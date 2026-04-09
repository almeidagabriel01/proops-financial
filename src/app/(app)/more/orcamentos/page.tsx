'use client';

import { useState } from 'react';
import { Plus, Wallet } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { BudgetProgressCard } from '@/components/budgets/budget-progress-card';
import { BudgetForm } from '@/components/budgets/budget-form';
import { Skeleton } from '@/components/ui/skeleton';
import { useBudgets, type Budget } from '@/hooks/use-budgets';
import { usePlan } from '@/hooks/use-plan';

export default function OrcamentosPage() {
  const plan = usePlan();
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Budget | null>(null);

  const budgets = useBudgets();

  const handleSubmit = async (category: string, monthly_limit: number) => {
    if (editing) {
      await budgets.update(editing.id, monthly_limit);
      toast.success('Orçamento atualizado!');
    } else {
      await budgets.create(category, monthly_limit);
      toast.success('Orçamento criado!');
    }
    setEditing(null);
  };

  const handleDelete = async (id: string) => {
    try {
      await budgets.remove(id);
      toast.success('Orçamento excluído');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Erro ao excluir');
    }
  };

  const canAdd = plan.isPro || budgets.data.length < plan.maxBudgetCategories;

  if (budgets.isLoading) {
    return (
      <div className="p-4 space-y-3">
        <h1 className="text-lg font-semibold">Orçamentos</h1>
        {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-24 w-full rounded-xl" />)}
      </div>
    );
  }

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold">Orçamentos</h1>
        {canAdd && (
          <Button size="sm" onClick={() => { setEditing(null); setFormOpen(true); }}>
            <Plus className="mr-1.5 h-4 w-4" /> Novo
          </Button>
        )}
      </div>

      {!plan.isPro && (
        <p className="text-xs text-muted-foreground">
          {budgets.data.length}/{plan.maxBudgetCategories} categorias (Basic)
        </p>
      )}

      {budgets.error && (
        <div className="rounded-lg border border-destructive/20 bg-destructive/5 p-3 text-sm text-destructive">
          {budgets.error}
        </div>
      )}

      {budgets.data.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-2 py-10 text-center text-muted-foreground">
          <Wallet className="h-10 w-10 opacity-30" />
          <p className="text-sm font-medium">Nenhum orçamento definido</p>
          <p className="text-xs">Defina limites por categoria para controlar seus gastos mensais.</p>
          <Button size="sm" className="mt-2" onClick={() => setFormOpen(true)}>
            <Plus className="mr-1.5 h-4 w-4" /> Criar Orçamento
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          {budgets.data.map((budget) => (
            <BudgetProgressCard
              key={budget.id}
              budget={budget}
              onEdit={(b) => { setEditing(b); setFormOpen(true); }}
              onDelete={(id) => void handleDelete(id)}
            />
          ))}
        </div>
      )}

      <BudgetForm
        open={formOpen}
        onClose={() => { setFormOpen(false); setEditing(null); }}
        onSubmit={handleSubmit}
        editing={editing}
      />
    </div>
  );
}
