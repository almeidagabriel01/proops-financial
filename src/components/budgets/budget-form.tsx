'use client';

import { useState } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { CategorySelector } from '@/components/transactions/category-selector';
import type { Budget } from '@/hooks/use-budgets';

interface BudgetFormProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (category: string, monthly_limit: number) => Promise<void>;
  editing?: Budget | null;
}

export function BudgetForm({ open, onClose, onSubmit, editing }: BudgetFormProps) {
  const [category, setCategory] = useState(editing?.category ?? 'outros');
  const [limitStr, setLimitStr] = useState(editing ? String(editing.monthly_limit) : '');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const limit = parseFloat(limitStr.replace(',', '.'));
    if (!limit || limit <= 0) {
      setError('Informe um limite válido');
      return;
    }
    setIsSubmitting(true);
    try {
      await onSubmit(category, limit);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao salvar orçamento');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <SheetContent side="bottom" className="rounded-t-2xl">
        <SheetHeader>
          <SheetTitle>{editing ? 'Editar Orçamento' : 'Novo Orçamento'}</SheetTitle>
        </SheetHeader>

        <form onSubmit={(e) => void handleSubmit(e)} className="mt-4 space-y-4">
          {!editing && (
            <div>
              <p className="mb-2 text-sm font-medium text-muted-foreground">Categoria</p>
              <CategorySelector
                currentCategory={category}
                onSelect={setCategory}
              />
            </div>
          )}

          <div>
            <label className="mb-1.5 block text-sm font-medium" htmlFor="limit">
              Limite Mensal (R$)
            </label>
            <Input
              id="limit"
              type="number"
              step="0.01"
              min="0.01"
              placeholder="500,00"
              value={limitStr}
              onChange={(e) => setLimitStr(e.target.value)}
              className="text-base"
            />
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}

          <div className="flex gap-3 pb-4">
            <Button type="button" variant="outline" className="flex-1" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit" className="flex-1" disabled={isSubmitting}>
              {isSubmitting ? 'Salvando...' : 'Salvar'}
            </Button>
          </div>
        </form>
      </SheetContent>
    </Sheet>
  );
}
