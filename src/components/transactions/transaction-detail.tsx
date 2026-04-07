'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { CategorySelector } from '@/components/transactions/category-selector';
import { CATEGORY_CONFIG } from '@/lib/utils/categories';
import { formatCurrency, formatDate } from '@/lib/utils/format';
import { saveCorrection, findSameDescriptionIds } from '@/lib/ai/category-correction';
import { createClient } from '@/lib/supabase/client';
import type { Transaction } from '@/hooks/use-transactions';
import type { Category } from '@/lib/billing/plans';

type DetailMode = 'view' | 'selecting' | 'confirming' | 'saving';

interface TransactionDetailProps {
  transaction: Transaction | null;
  open: boolean;
  onClose: () => void;
  onCategoryUpdated: (transactionId: string, newCategory: string) => void;
}

export function TransactionDetail({
  transaction: tx,
  open,
  onClose,
  onCategoryUpdated,
}: TransactionDetailProps) {
  const [mode, setMode] = useState<DetailMode>('view');
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
  const [sameIds, setSameIds] = useState<string[]>([]);
  const [saveError, setSaveError] = useState<string | null>(null);

  const supabase = createClient();

  function resetState() {
    setMode('view');
    setSelectedCategory(null);
    setSameIds([]);
    setSaveError(null);
  }

  function handleOpenChange(isOpen: boolean) {
    if (!isOpen && mode !== 'saving') {
      onClose();
      // Reset state after Sheet close animation finishes
      setTimeout(resetState, 300);
    }
  }

  // ── Category selection → check duplicates ────────────────────────────────────
  function handleCategorySelect(category: Category) {
    if (!tx) return;
    setSelectedCategory(category);
    setSaveError(null);
    setMode('saving'); // show spinner while querying duplicates

    findSameDescriptionIds(supabase, tx.user_id, tx.description, tx.id)
      .then((ids) => {
        setSameIds(ids);
        if (ids.length > 0) {
          setMode('confirming');
        } else {
          return doSave(category, [tx.id]);
        }
      })
      .catch((err: unknown) => {
        console.error('[transaction-detail] duplicate search error:', err);
        setSaveError('Erro ao verificar duplicatas. Tente novamente.');
        setMode('selecting');
      });
  }

  // ── Persist correction (single or batch) ─────────────────────────────────────
  function doSave(category: Category, transactionIds: string[]) {
    if (!tx) return Promise.resolve();
    setMode('saving');

    return saveCorrection(supabase, {
      userId: tx.user_id,
      transactionIds,
      description: tx.description,
      newCategory: category,
    })
      .then(() => {
        onCategoryUpdated(tx.id, category);
        toast.success(
          transactionIds.length > 1
            ? `${transactionIds.length} transações atualizadas`
            : 'Categoria atualizada',
        );
        onClose();
        setTimeout(resetState, 300);
      })
      .catch((err: unknown) => {
        console.error('[transaction-detail] save error:', err);
        setSaveError('Erro ao salvar. Tente novamente.');
        setMode(sameIds.length > 0 ? 'confirming' : 'selecting');
      });
  }

  function handleConfirmSingle() {
    if (!tx || !selectedCategory) return;
    void doSave(selectedCategory, [tx.id]);
  }

  function handleConfirmBatch() {
    if (!tx || !selectedCategory) return;
    void doSave(selectedCategory, [tx.id, ...sameIds]);
  }

  if (!tx) return null;

  const categoryKey = (tx.category ?? 'outros') as Category;
  const currentConfig = CATEGORY_CONFIG[categoryKey] ?? CATEGORY_CONFIG.outros;
  const CurrentIcon = currentConfig.icon;
  const isCredit = tx.type === 'credit';

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      <SheetContent side="bottom" className="max-h-[90dvh] overflow-y-auto rounded-t-2xl px-4 pb-8">
        <SheetHeader className="pb-4 pt-2">
          <SheetTitle>
            {mode === 'selecting'
              ? 'Escolha uma categoria'
              : mode === 'confirming'
                ? 'Corrigir categoria'
                : 'Detalhe da transação'}
          </SheetTitle>
        </SheetHeader>

        {/* ── VIEW: transaction detail ─────────────────────────────────── */}
        {mode === 'view' && (
          <div className="space-y-4">
            <div className="space-y-3 rounded-xl border border-border bg-muted/40 p-4">
              <div>
                <p className="text-xs text-muted-foreground">Descrição</p>
                <p className="mt-0.5 text-sm font-medium text-foreground">{tx.description}</p>
              </div>
              <div className="flex gap-6">
                <div>
                  <p className="text-xs text-muted-foreground">Data</p>
                  <p className="mt-0.5 text-sm text-foreground">{formatDate(tx.date)}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Valor</p>
                  <p
                    className={`mt-0.5 text-sm font-semibold ${
                      isCredit ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
                    }`}
                  >
                    {isCredit ? '+' : '-'}
                    {formatCurrency(Math.abs(tx.amount))}
                  </p>
                </div>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Categoria</p>
                <div className="mt-1 flex items-center gap-2">
                  <CurrentIcon className="h-4 w-4" style={{ color: currentConfig.color }} />
                  <span className="text-sm font-medium text-foreground">{currentConfig.label}</span>
                </div>
              </div>
            </div>

            <Button className="w-full" onClick={() => setMode('selecting')}>
              Corrigir categoria
            </Button>
          </div>
        )}

        {/* ── SELECTING: category grid ──────────────────────────────────── */}
        {mode === 'selecting' && (
          <div className="space-y-4">
            <CategorySelector
              currentCategory={tx.category ?? 'outros'}
              onSelect={handleCategorySelect}
            />
            <Button variant="ghost" className="w-full" onClick={() => setMode('view')}>
              Cancelar
            </Button>
          </div>
        )}

        {/* ── CONFIRMING: single vs batch choice ───────────────────────── */}
        {mode === 'confirming' && selectedCategory && (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Encontramos{' '}
              <strong className="text-foreground">{sameIds.length + 1} transações</strong> com a
              descrição{' '}
              <strong className="text-foreground">&quot;{tx.description}&quot;</strong>.
            </p>

            {saveError && (
              <p className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
                {saveError}
              </p>
            )}

            <Button className="w-full" onClick={handleConfirmBatch}>
              Corrigir todas ({sameIds.length + 1} transações)
            </Button>
            <Button variant="outline" className="w-full" onClick={handleConfirmSingle}>
              Corrigir só esta
            </Button>
            <Button variant="ghost" className="w-full" onClick={() => setMode('selecting')}>
              Voltar
            </Button>
          </div>
        )}

        {/* ── SAVING: loading spinner ───────────────────────────────────── */}
        {mode === 'saving' && (
          <div className="flex flex-col items-center gap-3 py-8">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
            <p className="text-sm text-muted-foreground">Salvando...</p>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
