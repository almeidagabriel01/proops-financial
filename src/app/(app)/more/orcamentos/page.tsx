'use client';

import { useState } from 'react';
import { Plus, Wallet } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { BudgetProgressCard } from '@/components/budgets/budget-progress-card';
import { BudgetForm } from '@/components/budgets/budget-form';
import { Skeleton } from '@/components/ui/skeleton';
import { MonthPickerFilter } from '@/components/ui/month-picker-filter';
import { useBudgets, type Budget } from '@/hooks/use-budgets';
import { usePlan } from '@/hooks/use-plan';
import { PushPermissionBanner } from '@/components/push/push-permission-banner';

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

  // Stats para o hero desktop
  const totalLimit = budgets.data.reduce((s, b) => s + b.monthly_limit, 0);
  const totalSpent = budgets.data.reduce((s, b) => s + (b.spent ?? 0), 0);
  const totalPct = totalLimit > 0 ? Math.min(100, Math.round((totalSpent / totalLimit) * 100)) : 0;

  if (budgets.isLoading) {
    return (
      <div className="h-full overflow-y-auto">
        <div className="p-4 space-y-3 lg:px-8 lg:py-6">
          <h1 className="text-lg font-semibold lg:text-2xl lg:font-bold">Orçamentos</h1>
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-24 w-full rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto">
      <div className="mx-auto w-full p-4 pb-24 space-y-4 lg:px-8 lg:py-6 lg:pb-28">
        {/* Desktop hero com stats */}
        <div className="hidden lg:flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Orçamentos</h1>
            {budgets.data.length > 0 && (
              <p className="mt-1 text-sm text-muted-foreground">
                {budgets.data.length} {budgets.data.length === 1 ? 'categoria' : 'categorias'} •{' '}
                {totalPct}% do limite total usado
              </p>
            )}
          </div>
          <div className="flex items-center gap-4">
            <MonthPickerFilter
              value={budgets.currentMonth}
              onChange={budgets.setCurrentMonth}
            />
            {budgets.data.length > 0 && (
              <div className="text-right">
                <div className="w-40">
                  <Progress value={totalPct} className="h-2" />
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  R$ {totalSpent.toFixed(2).replace('.', ',')} /{' '}
                  R$ {totalLimit.toFixed(2).replace('.', ',')}
                </p>
              </div>
            )}
            {canAdd && (
              <Button onClick={() => { setEditing(null); setFormOpen(true); }}>
                <Plus className="mr-1.5 h-4 w-4" /> Novo orçamento
              </Button>
            )}
          </div>
        </div>

        {/* Mobile header */}
        <div className="space-y-3 lg:hidden">
          <div className="flex items-center justify-between">
            <h1 className="text-lg font-semibold">Orçamentos</h1>
            {canAdd && (
              <Button size="sm" onClick={() => { setEditing(null); setFormOpen(true); }}>
                <Plus className="mr-1.5 h-4 w-4" /> Novo
              </Button>
            )}
          </div>
          <div className="flex justify-center">
            <MonthPickerFilter
              value={budgets.currentMonth}
              onChange={budgets.setCurrentMonth}
            />
          </div>
        </div>

        {/* Banner de permissão de push — exibido na primeira visita, gerenciado internamente */}
        <PushPermissionBanner />

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
          <div className="grid grid-cols-1 gap-3 lg:grid-cols-2 lg:gap-4 xl:grid-cols-3">
            {budgets.data.map((budget) => (
              <div
                key={budget.id}
                className="lg:shadow-[var(--shadow-elevated)] lg:hover:shadow-[var(--shadow-float)] lg:hover:-translate-y-0.5 lg:transition-all lg:rounded-xl"
              >
                <BudgetProgressCard
                  budget={budget}
                  currentMonth={budgets.currentMonth}
                  onEdit={(b) => { setEditing(b); setFormOpen(true); }}
                  onDelete={(id) => void handleDelete(id)}
                />
              </div>
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
    </div>
  );
}
