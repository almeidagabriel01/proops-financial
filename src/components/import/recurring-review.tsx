'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { formatCurrency } from '@/lib/utils/format';
import { normalizeForDetection, type RecurringCandidate } from '@/lib/recurring/detector';

const FREQUENCY_LABELS = {
  weekly: 'Semanal',
  biweekly: 'Quinzenal',
  monthly: 'Mensal',
  annual: 'Anual',
} as const;

type Frequency = keyof typeof FREQUENCY_LABELS;

interface ImportedTransaction {
  id: string;
  description: string;
  amount: number;
  type: 'credit' | 'debit';
  date: string;
  category: string;
}

interface SelectedRule {
  description: string;
  amount: number;
  type: 'credit' | 'debit';
  category: string;
  frequency: Frequency;
  startDate: string;
}

interface RecurringReviewProps {
  importId: string;
  bankAccountId: string;
  recurringCandidates: RecurringCandidate[];
  onDone: () => void;
}

export function RecurringReview({
  importId,
  bankAccountId,
  recurringCandidates,
  onDone,
}: RecurringReviewProps) {
  const [transactions, setTransactions] = useState<ImportedTransaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selected, setSelected] = useState<Map<string, SelectedRule>>(new Map());

  useEffect(() => {
    const supabase = createClient();

    async function load() {
      const { data } = await supabase
        .from('transactions')
        .select('id, description, amount, type, date, category')
        .eq('import_id', importId)
        .order('date', { ascending: false });

      setTransactions((data ?? []) as ImportedTransaction[]);

      const initial = new Map<string, SelectedRule>();
      for (const c of recurringCandidates) {
        initial.set(candidateKey(c), {
          description: c.description,
          amount: c.amount,
          type: c.type,
          category: c.category,
          frequency: c.frequency,
          startDate: c.lastDate,
        });
      }
      setSelected(initial);
      setIsLoading(false);
    }

    void load();
  }, [importId, recurringCandidates]);

  function candidateKey(c: RecurringCandidate) {
    return `c__${c.normalizedDescription}__${c.type}`;
  }

  function isTxCandidate(tx: ImportedTransaction) {
    const norm = normalizeForDetection(tx.description);
    return recurringCandidates.some((c) => c.normalizedDescription === norm && c.type === tx.type);
  }

  function toggleCandidate(c: RecurringCandidate) {
    const key = candidateKey(c);
    setSelected((prev) => {
      const next = new Map(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.set(key, {
          description: c.description,
          amount: c.amount,
          type: c.type,
          category: c.category,
          frequency: c.frequency,
          startDate: c.lastDate,
        });
      }
      return next;
    });
  }

  function toggleTransaction(tx: ImportedTransaction) {
    const key = `tx__${tx.id}`;
    setSelected((prev) => {
      const next = new Map(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.set(key, {
          description: tx.description,
          amount: Math.abs(tx.amount),
          type: tx.type,
          category: tx.category,
          frequency: 'monthly',
          startDate: tx.date,
        });
      }
      return next;
    });
  }

  function updateFrequency(key: string, frequency: Frequency) {
    setSelected((prev) => {
      const next = new Map(prev);
      const rule = next.get(key);
      if (rule) next.set(key, { ...rule, frequency });
      return next;
    });
  }

  async function handleConfirm() {
    setIsSubmitting(true);
    try {
      await Promise.allSettled(
        Array.from(selected.values()).map((rule) =>
          fetch('/api/recurring', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              description: rule.description,
              amount: rule.amount,
              type: rule.type,
              category: rule.category,
              frequency: rule.frequency,
              start_date: rule.startDate,
              bank_account_id: bankAccountId,
            }),
          })
        )
      );
    } finally {
      setIsSubmitting(false);
      onDone();
    }
  }

  const otherTransactions = transactions.filter((tx) => !isTxCandidate(tx));
  const selectedCount = selected.size;

  if (isLoading) {
    return (
      <div className="rounded-xl border border-border bg-card p-6 lg:max-w-xl">
        <div className="flex items-center gap-3">
          <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          <span className="text-sm text-muted-foreground">Analisando transações...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-border bg-card lg:max-w-xl">
      <div className="border-b border-border px-5 py-4">
        <h2 className="text-base font-semibold text-foreground">Transações recorrentes</h2>
        <p className="mt-0.5 text-sm text-muted-foreground">
          Marque os gastos que se repetem para monitoramento automático
        </p>
      </div>

      <div className="max-h-[440px] overflow-y-auto divide-y divide-border/50">
        {recurringCandidates.length > 0 && (
          <>
            <div className="bg-muted/30 px-5 py-2">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Detectados automaticamente
              </p>
            </div>
            {recurringCandidates.map((c) => {
              const key = candidateKey(c);
              const isChecked = selected.has(key);
              const rule = selected.get(key);
              return (
                <div key={key} className="flex items-center gap-3 px-5 py-3">
                  <Switch checked={isChecked} onCheckedChange={() => toggleCandidate(c)} size="sm" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-foreground">{c.description}</p>
                    <p className="text-xs text-muted-foreground">
                      {formatCurrency(c.amount)} · {c.occurrences}× detectado
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    {isChecked && rule ? (
                      <select
                        value={rule.frequency}
                        onChange={(e) => updateFrequency(key, e.target.value as Frequency)}
                        className="rounded-lg border border-border bg-background px-2 py-1 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                      >
                        {(Object.entries(FREQUENCY_LABELS) as [Frequency, string][]).map(
                          ([val, label]) => (
                            <option key={val} value={val}>
                              {label}
                            </option>
                          )
                        )}
                      </select>
                    ) : (
                      <Badge variant="secondary" className="text-xs">
                        {Math.round(c.confidence * 100)}%
                      </Badge>
                    )}
                  </div>
                </div>
              );
            })}
          </>
        )}

        {otherTransactions.length > 0 && (
          <>
            <div className="bg-muted/30 px-5 py-2">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Outras transações importadas
              </p>
            </div>
            {otherTransactions.map((tx) => {
              const key = `tx__${tx.id}`;
              const isChecked = selected.has(key);
              const rule = selected.get(key);
              return (
                <div key={tx.id} className="flex items-center gap-3 px-5 py-3">
                  <Switch
                    checked={isChecked}
                    onCheckedChange={() => toggleTransaction(tx)}
                    size="sm"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm text-foreground">{tx.description}</p>
                    <p className="text-xs text-muted-foreground">
                      {formatCurrency(Math.abs(tx.amount))}
                    </p>
                  </div>
                  {isChecked && rule && (
                    <select
                      value={rule.frequency}
                      onChange={(e) => updateFrequency(key, e.target.value as Frequency)}
                      className="shrink-0 rounded-lg border border-border bg-background px-2 py-1 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                    >
                      {(Object.entries(FREQUENCY_LABELS) as [Frequency, string][]).map(
                        ([val, label]) => (
                          <option key={val} value={val}>
                            {label}
                          </option>
                        )
                      )}
                    </select>
                  )}
                </div>
              );
            })}
          </>
        )}

        {transactions.length === 0 && recurringCandidates.length === 0 && (
          <div className="px-5 py-8 text-center text-sm text-muted-foreground">
            Nenhuma transação para exibir
          </div>
        )}
      </div>

      <div className="flex gap-3 border-t border-border px-5 py-4">
        <Button variant="outline" className="flex-1" onClick={onDone} disabled={isSubmitting}>
          Pular
        </Button>
        <Button className="flex-1" onClick={handleConfirm} disabled={isSubmitting}>
          {isSubmitting
            ? 'Salvando...'
            : selectedCount > 0
              ? `Confirmar (${selectedCount})`
              : 'Confirmar'}
        </Button>
      </div>
    </div>
  );
}
