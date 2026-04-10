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
import { DatePicker } from '@/components/ui/date-picker';
import { CategorySelector } from '@/components/transactions/category-selector';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useIsDesktop } from '@/hooks/use-is-desktop';
import { maskCurrency, parseCurrencyMask } from '@/lib/utils/format';
import { FREQUENCY_LABELS, type RecurringRule } from '@/hooks/use-recurring-rules';

interface RecurringFormProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: {
    description: string;
    amount: number;
    type: 'credit' | 'debit';
    category: string;
    frequency: RecurringRule['frequency'];
    start_date: string;
    end_date?: string | null;
    bank_account_id: string;
  }) => Promise<void>;
  bankAccounts: Array<{ id: string; bank_name: string }>;
}

const FORM_ID = 'recurring-form';

export function RecurringForm({ open, onClose, onSubmit, bankAccounts }: RecurringFormProps) {
  const isDesktop = useIsDesktop();

  const [type, setType] = useState<'debit' | 'credit'>('debit');
  const [description, setDescription] = useState('');
  const [amountStr, setAmountStr] = useState('');
  const [category, setCategory] = useState('outros');
  const [frequency, setFrequency] = useState<RecurringRule['frequency']>('monthly');
  const [startDate, setStartDate] = useState(new Date().toISOString().slice(0, 10));
  const [endDate, setEndDate] = useState('');
  const [bankAccountId, setBankAccountId] = useState(bankAccounts[0]?.id ?? '');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const reset = () => {
    setType('debit');
    setDescription('');
    setAmountStr('');
    setCategory('outros');
    setFrequency('monthly');
    setStartDate(new Date().toISOString().slice(0, 10));
    setEndDate('');
    setError(null);
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const amount = parseCurrencyMask(amountStr);
    if (!description.trim()) { setError('Descrição obrigatória'); return; }
    if (!amount || amount <= 0) { setError('Valor inválido'); return; }
    if (!startDate) { setError('Data de início obrigatória'); return; }
    if (!bankAccountId) { setError('Selecione uma conta'); return; }

    setIsSubmitting(true);
    try {
      await onSubmit({
        description: description.trim(),
        amount,
        type,
        category,
        frequency,
        start_date: startDate,
        end_date: endDate || null,
        bank_account_id: bankAccountId,
      });
      handleClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao criar recorrente');
    } finally {
      setIsSubmitting(false);
    }
  };

  /** Corpo do formulário — reutilizado em Dialog e Sheet */
  const formBody = (
    <form id={FORM_ID} onSubmit={(e) => void handleSubmit(e)} className="space-y-4">
      {/* Tipo: Despesa / Receita */}
      <div className="flex overflow-hidden rounded-lg border border-border">
        <button
          type="button"
          className={`min-h-[44px] flex-1 text-sm font-medium transition-colors ${
            type === 'debit' ? 'bg-destructive text-destructive-foreground' : 'hover:bg-muted'
          }`}
          onClick={() => { setType('debit'); setCategory('outros'); }}
        >
          Despesa
        </button>
        <button
          type="button"
          className={`min-h-[44px] flex-1 text-sm font-medium transition-colors ${
            type === 'credit' ? 'bg-green-600 text-white' : 'hover:bg-muted'
          }`}
          onClick={() => { setType('credit'); setCategory('salario'); }}
        >
          Receita
        </button>
      </div>

      {/* Descrição */}
      <div>
        <label className="mb-1.5 block text-sm font-medium" htmlFor="rec-desc">
          Descrição
        </label>
        <Input
          id="rec-desc"
          placeholder="Ex: Aluguel, Netflix, Salário..."
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
      </div>

      {/* Categoria — abaixo de Descrição */}
      <div>
        <label className="mb-1.5 block text-sm font-medium">Categoria</label>
        <CategorySelector currentCategory={category} onSelect={setCategory} />
      </div>

      {/* Valor + Frequência — 2 colunas no desktop, empilhados no mobile */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label className="mb-1.5 block text-sm font-medium" htmlFor="rec-amount">
            Valor (R$)
          </label>
          <Input
            id="rec-amount"
            type="text"
            inputMode="decimal"
            placeholder="0,00"
            value={amountStr}
            onChange={(e) => setAmountStr(maskCurrency(e.target.value))}
            className=""
          />
        </div>
        <div>
          <label className="mb-1.5 block text-sm font-medium">Frequência</label>
          <Select
            value={frequency}
            onValueChange={(v) => setFrequency(v as RecurringRule['frequency'])}
          >
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {(Object.entries(FREQUENCY_LABELS) as [RecurringRule['frequency'], string][]).map(
                ([val, label]) => (
                  <SelectItem key={val} value={val}>{label}</SelectItem>
                ),
              )}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Data início + Data fim — 2 colunas no desktop */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label className="mb-1.5 block text-sm font-medium">Data de início</label>
          <DatePicker
            value={startDate}
            onChange={setStartDate}
            placeholder="Selecionar data"
          />
        </div>
        <div>
          <label className="mb-1.5 block text-sm font-medium">
            Data de fim{' '}
            <span className="font-normal text-muted-foreground">(opcional)</span>
          </label>
          <DatePicker
            value={endDate}
            onChange={setEndDate}
            placeholder="Sem data de fim"
            min={startDate}
          />
        </div>
      </div>

      {/* Conta (apenas quando há múltiplas) */}
      {bankAccounts.length > 1 && (
        <div>
          <label className="mb-1.5 block text-sm font-medium">Conta</label>
          <Select value={bankAccountId} onValueChange={(v) => { if (v) setBankAccountId(v); }}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {bankAccounts.map((a) => (
                <SelectItem key={a.id} value={a.id}>{a.bank_name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {error && (
        <p className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </p>
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
          {isSubmitting ? 'Salvando...' : 'Criar'}
        </Button>
      </DialogFooter>
    ) : (
      <div className="mt-4 flex gap-3">
        <Button type="button" variant="outline" className="flex-1" onClick={handleClose}>
          Cancelar
        </Button>
        <Button type="submit" form={FORM_ID} className="flex-1" disabled={isSubmitting}>
          {isSubmitting ? 'Salvando...' : 'Criar'}
        </Button>
      </div>
    );

  /* ── Desktop: Dialog centralizado ────────────────────────────── */
  if (isDesktop) {
    return (
      <Dialog open={open} onOpenChange={(v) => !v && handleClose()}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Nova Transação Recorrente</DialogTitle>
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
        className="max-h-[92dvh] overflow-y-auto rounded-t-2xl"
        style={{ paddingBottom: 'calc(1.5rem + env(safe-area-inset-bottom, 0px))' }}
      >
        <SheetHeader>
          <SheetTitle>Nova Transação Recorrente</SheetTitle>
        </SheetHeader>
        <div className="mt-4 px-4 pb-2">
          {formBody}
          {actionButtons('sheet')}
        </div>
      </SheetContent>
    </Sheet>
  );
}
