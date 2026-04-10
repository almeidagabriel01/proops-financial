'use client';

import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { DatePicker } from '@/components/ui/date-picker';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { CategorySelector } from '@/components/transactions/category-selector';
import { useIsDesktop } from '@/hooks/use-is-desktop';
import { sanitizeCategory } from '@/lib/utils/categories';
import { maskCurrency, parseCurrencyMask, initCurrencyMask } from '@/lib/utils/format';
import type { Transaction } from '@/hooks/use-transactions';
import { createClient } from '@/lib/supabase/client';

interface BankAccount {
  id: string;
  bank_name: string;
  account_label: string | null;
}

interface TransactionFormValues {
  date: string;
  description: string;
  amount: string;
  type: 'credit' | 'debit';
  category: string;
  bank_account_id: string;
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
  transaction?: Transaction;
}

const FORM_ID = 'transaction-form';
const DATE_WARN_YEARS = 10;

function todayISO(): string {
  return new Date().toISOString().split('T')[0];
}

function getDateWarning(dateStr: string): string | null {
  if (!dateStr) return null;
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return null;
  const now = new Date();
  const diffYears = (date.getTime() - now.getTime()) / (1000 * 60 * 60 * 24 * 365.25);
  if (diffYears < -DATE_WARN_YEARS) return `Data muito antiga (mais de ${DATE_WARN_YEARS} anos no passado).`;
  if (diffYears > DATE_WARN_YEARS) return `Data muito futura (mais de ${DATE_WARN_YEARS} anos à frente).`;
  return null;
}

export function TransactionForm({ open, onClose, onSuccess, transaction }: TransactionFormProps) {
  const isEdit = !!transaction;
  const isDesktop = useIsDesktop();
  const supabase = createClient();

  const [accounts, setAccounts] = useState<BankAccount[]>([]);
  const [values, setValues] = useState<TransactionFormValues>(() => ({
    date: transaction?.date ?? todayISO(),
    description: transaction?.description ?? '',
    amount: initCurrencyMask(transaction ? Math.abs(transaction.amount) : undefined),
    type: transaction?.type ?? 'debit',
    category: transaction?.category ?? 'outros',
    bank_account_id: transaction?.bank_account_id ?? 'manual',
  }));
  const [errors, setErrors] = useState<TransactionFormErrors>({});
  const [dateWarning, setDateWarning] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    supabase
      .from('bank_accounts')
      .select('id, bank_name, account_label')
      .order('bank_name', { ascending: true })
      .then(({ data }) => { setAccounts(data ?? []); });
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (open) {
      setValues({
        date: transaction?.date ?? todayISO(),
        description: transaction?.description ?? '',
        amount: initCurrencyMask(transaction ? Math.abs(transaction.amount) : undefined),
        type: transaction?.type ?? 'debit',
        category: transaction?.category ?? 'outros',
        bank_account_id: transaction?.bank_account_id ?? 'manual',
      });
      setErrors({});
      setDateWarning(null);
      setServerError(null);
    }
  }, [open, transaction]);

  function validate(): boolean {
    const newErrors: TransactionFormErrors = {};
    if (!values.date) newErrors.date = 'Data obrigatória';
    if (!values.description.trim()) {
      newErrors.description = 'Descrição obrigatória';
    } else if (values.description.trim().length > 255) {
      newErrors.description = 'Máximo 255 caracteres';
    }
    const numericAmount = parseCurrencyMask(values.amount);
    if (!values.amount || numericAmount <= 0) {
      newErrors.amount = 'Valor deve ser maior que zero';
    } else if (numericAmount > 999999.99) {
      newErrors.amount = 'Valor máximo: R$ 999.999,99';
    }
    const cat = sanitizeCategory(values.category);
    if (!cat) newErrors.category = 'Selecione ou informe uma categoria';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }

  const hasErrors = Object.keys(errors).some((k) => !!errors[k as keyof TransactionFormErrors]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;
    setIsSaving(true);
    setServerError(null);

    const amount = parseCurrencyMask(values.amount);
    const body: Record<string, unknown> = {
      date: values.date,
      description: values.description.trim(),
      amount,
      type: values.type,
      category: values.category,
    };
    if (!isEdit && values.bank_account_id !== 'manual') {
      body.bank_account_id = values.bank_account_id;
    }

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
      toast.success(isEdit ? 'Transação atualizada' : 'Transação adicionada com sucesso');
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
    onClose();
  }

  const title = isEdit ? 'Editar transação' : 'Nova transação';
  const submitLabel = isSaving ? 'Salvando...' : isEdit ? 'Salvar alterações' : 'Adicionar transação';

  const formBody = (
    <form id={FORM_ID} onSubmit={(e) => void handleSubmit(e)} noValidate className="space-y-4">
      {/* Tipo */}
      <div className="grid grid-cols-2 gap-2 rounded-xl bg-muted p-1">
        <button
          type="button"
          onClick={() => setValues((v) => ({ ...v, type: 'debit' }))}
          className={`min-h-[44px] rounded-lg py-2 text-sm font-medium transition-colors ${
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
          className={`min-h-[44px] rounded-lg py-2 text-sm font-medium transition-colors ${
            values.type === 'credit'
              ? 'bg-background text-foreground shadow-sm'
              : 'text-muted-foreground'
          }`}
        >
          Receita
        </button>
      </div>

      {/* Descrição */}
      <div>
        <label className="mb-1.5 block text-sm font-medium text-foreground" htmlFor="txn-desc">
          Descrição
        </label>
        <input
          id="txn-desc"
          type="text"
          placeholder="Ex: Aluguel, Salário, Supermercado..."
          maxLength={255}
          value={values.description}
          onChange={(e) => {
            setValues((prev) => ({ ...prev, description: e.target.value }));
            if (errors.description) setErrors((prev) => ({ ...prev, description: undefined }));
          }}
          className={`h-10 w-full rounded-md border bg-background px-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring transition-colors ${
            errors.description ? 'border-destructive' : 'border-input'
          }`}
        />
        {errors.description && (
          <p className="mt-1 text-xs text-destructive">{errors.description}</p>
        )}
      </div>

      {/* Categoria */}
      <div>
        <label className="mb-1.5 block text-sm font-medium text-foreground">Categoria</label>
        <CategorySelector
          currentCategory={values.category}
          onSelect={(cat) => {
            setValues((prev) => ({ ...prev, category: cat }));
            if (errors.category) setErrors((prev) => ({ ...prev, category: undefined }));
          }}
        />
        {errors.category && (
          <p className="mt-1 text-xs text-destructive">{errors.category}</p>
        )}
      </div>

      {/* Valor + Data — 2 colunas no desktop */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label className="mb-1.5 block text-sm font-medium text-foreground" htmlFor="txn-amount">
            Valor (R$)
          </label>
          <input
            id="txn-amount"
            type="text"
            inputMode="decimal"
            placeholder="0,00"
            value={values.amount}
            onChange={(e) => {
              setValues((prev) => ({ ...prev, amount: maskCurrency(e.target.value) }));
              if (errors.amount) setErrors((prev) => ({ ...prev, amount: undefined }));
            }}
            className={`h-10 w-full rounded-md border bg-background px-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring transition-colors ${
              errors.amount ? 'border-destructive' : 'border-input'
            }`}
          />
          {errors.amount && (
            <p className="mt-1 text-xs text-destructive">{errors.amount}</p>
          )}
        </div>
        <div>
          <label className="mb-1.5 block text-sm font-medium text-foreground">Data</label>
          <DatePicker
            value={values.date}
            onChange={(v) => {
              setValues((prev) => ({ ...prev, date: v }));
              setDateWarning(getDateWarning(v));
              if (errors.date) setErrors((prev) => ({ ...prev, date: undefined }));
            }}
            placeholder="Selecionar data"
          />
          {errors.date && (
            <p className="mt-1 text-xs text-destructive">{errors.date}</p>
          )}
          {!errors.date && dateWarning && (
            <p className="mt-1 text-xs text-yellow-600 dark:text-yellow-400">{dateWarning}</p>
          )}
        </div>
      </div>

      {/* Conta — apenas no modo criar */}
      {!isEdit && (
        <div>
          <label className="mb-1.5 block text-sm font-medium text-foreground">
            Conta <span className="font-normal text-muted-foreground">(opcional)</span>
          </label>
          <Select
            value={values.bank_account_id}
            onValueChange={(v) => setValues((prev) => ({ ...prev, bank_account_id: v ?? 'manual' }))}
          >
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="manual">Manual (criada automaticamente)</SelectItem>
              {accounts.map((acc) => (
                <SelectItem key={acc.id} value={acc.id}>
                  {acc.bank_name}{acc.account_label ? ` — ${acc.account_label}` : ''}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {serverError && (
        <p className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {serverError}
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
        <Button type="submit" form={FORM_ID} disabled={isSaving || hasErrors}>
          {submitLabel}
        </Button>
      </DialogFooter>
    ) : (
      <div className="mt-4 flex gap-3">
        <Button type="button" variant="outline" className="flex-1" onClick={handleClose}>
          Cancelar
        </Button>
        <Button type="submit" form={FORM_ID} className="flex-1" disabled={isSaving || hasErrors}>
          {submitLabel}
        </Button>
      </div>
    );

  /* ── Desktop: Dialog centralizado ────────────────────────────── */
  if (isDesktop) {
    return (
      <Dialog open={open} onOpenChange={(v) => !v && handleClose()}>
        <DialogContent className="sm:max-w-lg">
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
    <Sheet open={open} onOpenChange={(o) => !o && handleClose()}>
      <SheetContent
        side="bottom"
        className="max-h-[92dvh] overflow-y-auto rounded-t-2xl"
        style={{ paddingBottom: 'calc(1.5rem + env(safe-area-inset-bottom, 0px))' }}
      >
        <SheetHeader>
          <SheetTitle>{title}</SheetTitle>
        </SheetHeader>
        <div className="mt-4 px-4 pb-2">
          {formBody}
          {actionButtons('sheet')}
        </div>
      </SheetContent>
    </Sheet>
  );
}
