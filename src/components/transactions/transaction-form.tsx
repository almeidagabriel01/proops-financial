'use client';

import { useState } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { CATEGORIES } from '@/lib/billing/plans';
import type { Category } from '@/lib/billing/plans';
import type { Transaction } from '@/hooks/use-transactions';

const CATEGORY_LABELS: Record<Category, string> = {
  alimentacao: 'Alimentação',
  delivery: 'Delivery',
  transporte: 'Transporte',
  moradia: 'Moradia',
  saude: 'Saúde',
  educacao: 'Educação',
  lazer: 'Lazer',
  compras: 'Compras',
  assinaturas: 'Assinaturas',
  transferencias: 'Transferências',
  salario: 'Salário',
  investimentos: 'Investimentos',
  impostos: 'Impostos',
  outros: 'Outros',
};

interface TransactionFormValues {
  date: string;
  description: string;
  amount: string;
  type: 'credit' | 'debit';
  category: Category;
}

interface TransactionFormErrors {
  date?: string;
  description?: string;
  amount?: string;
  category?: string;
}

interface TransactionFormProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  /** When provided, the form is in edit mode */
  transaction?: Transaction;
}

function todayISO(): string {
  return new Date().toISOString().split('T')[0];
}

function parseAmountDisplay(tx: Transaction): string {
  return Math.abs(tx.amount).toFixed(2).replace('.', ',');
}

export function TransactionForm({ open, onClose, onSuccess, transaction }: TransactionFormProps) {
  const isEdit = !!transaction;

  const [values, setValues] = useState<TransactionFormValues>(() => ({
    date: transaction?.date ?? todayISO(),
    description: transaction?.description ?? '',
    amount: transaction ? parseAmountDisplay(transaction) : '',
    type: transaction?.type ?? 'debit',
    category: (transaction?.category as Category) ?? 'outros',
  }));
  const [errors, setErrors] = useState<TransactionFormErrors>({});
  const [isSaving, setIsSaving] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  function validate(): boolean {
    const newErrors: TransactionFormErrors = {};

    if (!values.date) {
      newErrors.date = 'Data obrigatória';
    }

    if (!values.description.trim()) {
      newErrors.description = 'Descrição obrigatória';
    } else if (values.description.trim().length > 255) {
      newErrors.description = 'Máximo 255 caracteres';
    }

    const numericAmount = parseFloat(values.amount.replace(',', '.'));
    if (!values.amount || isNaN(numericAmount) || numericAmount <= 0) {
      newErrors.amount = 'Valor deve ser maior que zero';
    } else if (numericAmount > 999999.99) {
      newErrors.amount = 'Valor máximo: R$ 999.999,99';
    }

    if (!CATEGORIES.includes(values.category)) {
      newErrors.category = 'Selecione uma categoria';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;

    setIsSaving(true);
    setServerError(null);

    const amount = parseFloat(values.amount.replace(',', '.'));
    const body = {
      date: values.date,
      description: values.description.trim(),
      amount,
      type: values.type,
      category: values.category,
    };

    try {
      const url = isEdit ? `/api/transactions/${transaction!.id}` : '/api/transactions';
      const method = isEdit ? 'PATCH' : 'POST';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        setServerError(data.error ?? 'Erro ao salvar transação');
        return;
      }

      onSuccess();
      onClose();
    } catch {
      setServerError('Erro de conexão. Tente novamente.');
    } finally {
      setIsSaving(false);
    }
  }

  function handleClose() {
    if (isSaving) return;
    setErrors({});
    setServerError(null);
    onClose();
  }

  return (
    <Sheet open={open} onOpenChange={(o) => !o && handleClose()}>
      <SheetContent side="bottom" className="max-h-[90dvh] overflow-y-auto rounded-t-2xl px-4 pb-8">
        <SheetHeader className="pb-4 pt-2">
          <SheetTitle>{isEdit ? 'Editar transação' : 'Nova transação'}</SheetTitle>
        </SheetHeader>

        <form onSubmit={handleSubmit} noValidate className="space-y-4">
          {/* Tipo — toggle receita/despesa */}
          <div className="grid grid-cols-2 gap-2 rounded-xl bg-muted p-1">
            <button
              type="button"
              onClick={() => setValues((v) => ({ ...v, type: 'debit' }))}
              className={`rounded-lg py-2 text-sm font-medium transition-colors ${
                values.type === 'debit'
                  ? 'bg-background text-foreground shadow-sm'
                  : 'text-muted-foreground'
              }`}
            >
              Despesa
            </button>
            <button
              type="button"
              onClick={() => setValues((v) => ({ ...v, type: 'credit' }))}
              className={`rounded-lg py-2 text-sm font-medium transition-colors ${
                values.type === 'credit'
                  ? 'bg-background text-foreground shadow-sm'
                  : 'text-muted-foreground'
              }`}
            >
              Receita
            </button>
          </div>

          {/* Valor */}
          <div>
            <label className="mb-1.5 block text-sm font-medium text-foreground">
              Valor (R$)
            </label>
            <Input
              type="text"
              inputMode="decimal"
              placeholder="0,00"
              value={values.amount}
              onChange={(e) => {
                const v = e.target.value.replace(/[^0-9,]/g, '');
                setValues((prev) => ({ ...prev, amount: v }));
                if (errors.amount) setErrors((prev) => ({ ...prev, amount: undefined }));
              }}
              className={errors.amount ? 'border-destructive' : ''}
            />
            {errors.amount && (
              <p className="mt-1 text-xs text-destructive">{errors.amount}</p>
            )}
          </div>

          {/* Descrição */}
          <div>
            <label className="mb-1.5 block text-sm font-medium text-foreground">
              Descrição
            </label>
            <Input
              type="text"
              placeholder="Ex: Aluguel, Salário, Supermercado..."
              maxLength={255}
              value={values.description}
              onChange={(e) => {
                setValues((prev) => ({ ...prev, description: e.target.value }));
                if (errors.description) setErrors((prev) => ({ ...prev, description: undefined }));
              }}
              className={errors.description ? 'border-destructive' : ''}
            />
            {errors.description && (
              <p className="mt-1 text-xs text-destructive">{errors.description}</p>
            )}
          </div>

          {/* Categoria */}
          <div>
            <label className="mb-1.5 block text-sm font-medium text-foreground">
              Categoria
            </label>
            <Select
              value={values.category}
              onValueChange={(v) => {
                setValues((prev) => ({ ...prev, category: v as Category }));
                if (errors.category) setErrors((prev) => ({ ...prev, category: undefined }));
              }}
            >
              <SelectTrigger className={errors.category ? 'border-destructive' : ''}>
                <SelectValue placeholder="Selecione..." />
              </SelectTrigger>
              <SelectContent>
                {CATEGORIES.map((cat) => (
                  <SelectItem key={cat} value={cat}>
                    {CATEGORY_LABELS[cat]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.category && (
              <p className="mt-1 text-xs text-destructive">{errors.category}</p>
            )}
          </div>

          {/* Data */}
          <div>
            <label className="mb-1.5 block text-sm font-medium text-foreground">
              Data
            </label>
            <input
              type="date"
              value={values.date}
              onChange={(e) => {
                setValues((prev) => ({ ...prev, date: e.target.value }));
                if (errors.date) setErrors((prev) => ({ ...prev, date: undefined }));
              }}
              className={`h-10 w-full rounded-md border bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring ${
                errors.date ? 'border-destructive' : 'border-input'
              }`}
            />
            {errors.date && (
              <p className="mt-1 text-xs text-destructive">{errors.date}</p>
            )}
          </div>

          {serverError && (
            <p className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {serverError}
            </p>
          )}

          <Button
            type="submit"
            className="w-full"
            size="lg"
            disabled={isSaving}
          >
            {isSaving ? 'Salvando...' : isEdit ? 'Salvar alterações' : 'Adicionar transação'}
          </Button>
        </form>
      </SheetContent>
    </Sheet>
  );
}
