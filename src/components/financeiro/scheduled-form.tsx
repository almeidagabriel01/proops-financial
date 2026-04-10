'use client';

import { useState } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { CategorySelector } from '@/components/transactions/category-selector';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface ScheduledFormProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: {
    description: string;
    amount: number;
    type: 'credit' | 'debit';
    category: string;
    due_date: string;
    bank_account_id: string;
    notes?: string;
  }) => Promise<void>;
  bankAccounts: Array<{ id: string; bank_name: string }>;
}

export function ScheduledForm({ open, onClose, onSubmit, bankAccounts }: ScheduledFormProps) {
  const [type, setType] = useState<'debit' | 'credit'>('debit');
  const [description, setDescription] = useState('');
  const [amountStr, setAmountStr] = useState('');
  const [category, setCategory] = useState('outros');
  const [dueDate, setDueDate] = useState('');
  const [bankAccountId, setBankAccountId] = useState(bankAccounts[0]?.id ?? '');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const reset = () => {
    setType('debit');
    setDescription('');
    setAmountStr('');
    setCategory('outros');
    setDueDate('');
    setNotes('');
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
    if (!dueDate) { setError('Data de vencimento obrigatória'); return; }
    if (!bankAccountId) { setError('Selecione uma conta'); return; }

    setIsSubmitting(true);
    try {
      await onSubmit({ description: description.trim(), amount, type, category, due_date: dueDate, bank_account_id: bankAccountId, notes: notes || undefined });
      handleClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao criar agendamento');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={(v) => { if (!v) handleClose(); }}>
      {/*
       * max-h-[90dvh] + overflow-y-auto: evita que a modal ultrapasse
       * a viewport em telas pequenas — o conteúdo fica rolável.
       * O conteúdo interno é limitado a max-w-lg para não ficar
       * muito largo em telas desktop.
       */}
      <SheetContent
        side="bottom"
        className="max-h-[90dvh] overflow-y-auto rounded-t-2xl"
        style={{ paddingBottom: 'calc(1.5rem + env(safe-area-inset-bottom, 0px))' }}
      >
        <div className="mx-auto w-full max-w-lg">
          <SheetHeader>
            <SheetTitle>Agendar Conta</SheetTitle>
          </SheetHeader>

          <form onSubmit={(e) => void handleSubmit(e)} className="mt-4 space-y-4">
            {/* Tipo */}
            <div className="flex overflow-hidden rounded-lg border border-border">
              <button
                type="button"
                className={`min-h-[44px] flex-1 py-2 text-sm font-medium transition-colors ${type === 'debit' ? 'bg-destructive text-destructive-foreground' : 'hover:bg-muted'}`}
                onClick={() => { setType('debit'); setCategory('outros'); }}
              >
                Despesa
              </button>
              <button
                type="button"
                className={`min-h-[44px] flex-1 py-2 text-sm font-medium transition-colors ${type === 'credit' ? 'bg-green-600 text-white' : 'hover:bg-muted'}`}
                onClick={() => { setType('credit'); setCategory('salario'); }}
              >
                Receita
              </button>
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium" htmlFor="sched-desc">Descrição</label>
              <Input id="sched-desc" placeholder="Ex: Aluguel, Salário..." value={description} onChange={(e) => setDescription(e.target.value)} />
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium" htmlFor="sched-amount">Valor (R$)</label>
              <Input id="sched-amount" type="number" step="0.01" min="0.01" placeholder="0,00" value={amountStr} onChange={(e) => setAmountStr(e.target.value)} className="text-base" />
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium" htmlFor="sched-date">Vencimento</label>
              <Input id="sched-date" type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium">Categoria</label>
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
                {isSubmitting ? 'Salvando...' : 'Agendar'}
              </Button>
            </div>
          </form>
        </div>
      </SheetContent>
    </Sheet>
  );
}
