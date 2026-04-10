'use client';

import { useState } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { CategorySelector } from '@/components/transactions/category-selector';
import { useIsDesktop } from '@/hooks/use-is-desktop';
import type { Budget } from '@/hooks/use-budgets';

interface BudgetFormProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (category: string, monthly_limit: number) => Promise<void>;
  editing?: Budget | null;
}

const FORM_ID = 'budget-form';

export function BudgetForm({ open, onClose, onSubmit, editing }: BudgetFormProps) {
  const isDesktop = useIsDesktop();
  const [category, setCategory] = useState(editing?.category ?? 'outros');
  const [limitStr, setLimitStr] = useState(editing ? String(editing.monthly_limit) : '');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleClose = () => { if (!isSubmitting) onClose(); };

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

  const title = editing ? 'Editar Orçamento' : 'Novo Orçamento';

  const formBody = (
    <form id={FORM_ID} onSubmit={(e) => void handleSubmit(e)} className="space-y-4">
      {!editing && (
        <div>
          <label className="mb-1.5 block text-sm font-medium">Categoria</label>
          <CategorySelector currentCategory={category} onSelect={setCategory} />
        </div>
      )}

      <div>
        <label className="mb-1.5 block text-sm font-medium" htmlFor="budget-limit">
          Limite Mensal (R$)
        </label>
        <Input
          id="budget-limit"
          type="number"
          step="0.01"
          min="0.01"
          placeholder="500,00"
          value={limitStr}
          onChange={(e) => setLimitStr(e.target.value)}
          className="text-base"
        />
      </div>

      {error && (
        <p className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>
      )}
    </form>
  );

  const actionButtons = (variant: 'dialog' | 'sheet') =>
    variant === 'dialog' ? (
      <DialogFooter>
        <Button type="button" variant="outline" onClick={handleClose}>
          Cancelar
        </Button>
        <Button type="submit" form={FORM_ID} disabled={isSubmitting}>
          {isSubmitting ? 'Salvando...' : 'Salvar'}
        </Button>
      </DialogFooter>
    ) : (
      <div className="mt-4 flex gap-3">
        <Button type="button" variant="outline" className="flex-1" onClick={handleClose}>
          Cancelar
        </Button>
        <Button type="submit" form={FORM_ID} className="flex-1" disabled={isSubmitting}>
          {isSubmitting ? 'Salvando...' : 'Salvar'}
        </Button>
      </div>
    );

  /* ── Desktop: Dialog centralizado ────────────────────────────── */
  if (isDesktop) {
    return (
      <Dialog open={open} onOpenChange={(v) => !v && handleClose()}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{title}</DialogTitle>
          </DialogHeader>
          {formBody}
          {actionButtons('dialog')}
        </DialogContent>
      </Dialog>
    );
  }

  /* ── Mobile: Sheet da base ────────────────────────────────────── */
  return (
    <Sheet open={open} onOpenChange={(v) => { if (!v) handleClose(); }}>
      <SheetContent
        side="bottom"
        className="max-h-[80dvh] overflow-y-auto rounded-t-2xl"
        style={{ paddingBottom: 'calc(1.5rem + env(safe-area-inset-bottom, 0px))' }}
      >
        <SheetHeader>
          <SheetTitle>{title}</SheetTitle>
        </SheetHeader>
        <div className="mt-4">
          {formBody}
          {actionButtons('sheet')}
        </div>
      </SheetContent>
    </Sheet>
  );
}
