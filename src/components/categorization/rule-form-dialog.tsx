'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { CATEGORIES } from '@/lib/billing/plans';

const MATCH_TYPE_LABELS: Record<string, string> = {
  contains: 'Contém',
  exact: 'Igual a',
  starts_with: 'Começa com',
};

const CATEGORY_LABELS: Record<string, string> = {
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

type RuleFormValues = {
  pattern: string;
  match_type: 'contains' | 'exact' | 'starts_with';
  category: string;
  priority: number;
  active: boolean;
};

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialValues?: Partial<RuleFormValues>;
  onSubmit: (values: RuleFormValues) => Promise<void>;
  title?: string;
};

export function RuleFormDialog({ open, onOpenChange, initialValues, onSubmit, title = 'Nova Regra' }: Props) {
  const [pattern, setPattern] = useState(initialValues?.pattern ?? '');
  const [matchType, setMatchType] = useState<RuleFormValues['match_type']>(
    initialValues?.match_type ?? 'contains'
  );
  const [category, setCategory] = useState(initialValues?.category ?? '');
  const [priority, setPriority] = useState(initialValues?.priority ?? 0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');

    if (pattern.trim().length < 2) {
      setError('Padrão deve ter pelo menos 2 caracteres.');
      return;
    }
    if (!category) {
      setError('Selecione uma categoria.');
      return;
    }

    setLoading(true);
    try {
      await onSubmit({
        pattern: pattern.trim(),
        match_type: matchType,
        category,
        priority,
        active: initialValues?.active ?? true,
      });
      onOpenChange(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao salvar regra.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          {/* Pattern */}
          <div className="space-y-1">
            <label className="text-sm font-medium" htmlFor="rule-pattern">
              Padrão de descrição
            </label>
            <div className="flex gap-2">
              <Select
                value={matchType}
                onValueChange={(v) => setMatchType(v as RuleFormValues['match_type'])}
              >
                <SelectTrigger className="w-36 shrink-0" size="sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(MATCH_TYPE_LABELS).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Input
                id="rule-pattern"
                placeholder="ex: IFOOD, UBER, SALARIO"
                value={pattern}
                onChange={(e) => setPattern(e.target.value)}
                className="flex-1"
                autoComplete="off"
              />
            </div>
            <p className="text-xs text-muted-foreground">
              Não diferencia maiúsculas/minúsculas nem acentos.
            </p>
          </div>

          {/* Category */}
          <div className="space-y-1">
            <label className="text-sm font-medium" htmlFor="rule-category">
              Categoria
            </label>
            <Select value={category} onValueChange={(v) => { if (v) setCategory(v); }}>
              <SelectTrigger id="rule-category" className="w-full">
                <SelectValue placeholder="Selecione uma categoria" />
              </SelectTrigger>
              <SelectContent>
                {CATEGORIES.map((cat) => (
                  <SelectItem key={cat} value={cat}>
                    {CATEGORY_LABELS[cat] ?? cat}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Priority */}
          <div className="space-y-1">
            <label className="text-sm font-medium" htmlFor="rule-priority">
              Prioridade
            </label>
            <Input
              id="rule-priority"
              type="number"
              value={priority}
              onChange={(e) => setPriority(Number(e.target.value))}
              min={0}
              max={999}
            />
            <p className="text-xs text-muted-foreground">
              Regras com maior prioridade são aplicadas primeiro.
            </p>
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
              Cancelar
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Salvando...' : 'Salvar'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
