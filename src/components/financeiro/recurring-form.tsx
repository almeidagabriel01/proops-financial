'use client';

import { useState } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { CategorySelector } from '@/components/transactions/category-selector';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
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

export function RecurringForm({ open, onClose, onSubmit, bankAccounts }: RecurringFormProps) {
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
    const amount = parseFloat(amountStr.replace(',', '.'));
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

  return (
    <Sheet open={open} onOpenChange={(v) => { if (!v) handleClose(); }}>
      <SheetContent side="bottom" className="rounded-t-2xl max-h-[92dvh] overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Nova Transação Recorrente</SheetTitle>
        </SheetHeader>

        <form onSubmit={(e) => void handleSubmit(e)} className="mt-4 space-y-4 pb-6">
          {/* Tipo */}
          <div className="flex overflow-hidden rounded-lg border border-border">
            <button
              type="button"
              className={`flex-1 py-2 text-sm font-medium transition-colors ${type === 'debit' ? 'bg-destructive text-destructive-foreground' : 'hover:bg-muted'}`}
              onClick={() => { setType('debit'); setCategory('outros'); }}
            >
              Despesa
            </button>
            <button
              type="button"
              className={`flex-1 py-2 text-sm font-medium transition-colors ${type === 'credit' ? 'bg-green-600 text-white' : 'hover:bg-muted'}`}
              onClick={() => { setType('credit'); setCategory('salario'); }}
            >
              Receita
            </button>
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium" htmlFor="rec-desc">Descrição</label>
            <Input id="rec-desc" placeholder="Ex: Aluguel, Netflix, Salário..." value={description} onChange={(e) => setDescription(e.target.value)} />
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium" htmlFor="rec-amount">Valor (R$)</label>
            <Input id="rec-amount" type="number" step="0.01" min="0.01" placeholder="0,00" value={amountStr} onChange={(e) => setAmountStr(e.target.value)} className="text-base" />
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium">Frequência</label>
            <Select value={frequency} onValueChange={(v) => setFrequency(v as RecurringRule['frequency'])}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {(Object.entries(FREQUENCY_LABELS) as [RecurringRule['frequency'], string][]).map(([val, label]) => (
                  <SelectItem key={val} value={val}>{label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium" htmlFor="rec-start">Data de início</label>
            <Input id="rec-start" type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium" htmlFor="rec-end">Data de fim <span className="text-muted-foreground">(opcional)</span></label>
            <Input id="rec-end" type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} min={startDate} />
          </div>

          <div>
            <p className="mb-2 text-sm font-medium text-muted-foreground">Categoria</p>
            <CategorySelector currentCategory={category} onSelect={setCategory} />
          </div>

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

          {error && <p className="text-sm text-destructive">{error}</p>}

          <div className="flex gap-3">
            <Button type="button" variant="outline" className="flex-1" onClick={handleClose}>Cancelar</Button>
            <Button type="submit" className="flex-1" disabled={isSubmitting}>
              {isSubmitting ? 'Salvando...' : 'Criar'}
            </Button>
          </div>
        </form>
      </SheetContent>
    </Sheet>
  );
}
