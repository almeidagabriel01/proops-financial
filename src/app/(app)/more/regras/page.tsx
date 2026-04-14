'use client';

import { useState } from 'react';
import { Plus, Sliders } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { RuleCard } from '@/components/categorization/rule-card';
import { RuleFormDialog } from '@/components/categorization/rule-form-dialog';
import { useCategorizationRules, type CategorizationRule } from '@/hooks/use-categorization-rules';
import type { MatchType } from '@/hooks/use-categorization-rules';

export default function RegrasPage() {
  const rules = useCategorizationRules();
  const [createOpen, setCreateOpen] = useState(false);

  async function handleCreate(values: {
    pattern: string;
    match_type: MatchType;
    category: string;
    priority: number;
    active: boolean;
  }) {
    await rules.create(values);
    toast.success('Regra criada!');
  }

  async function handleUpdate(id: string, updates: Partial<CategorizationRule>) {
    await rules.update(id, updates);
    toast.success('Regra atualizada!');
  }

  async function handleDelete(id: string) {
    await rules.remove(id);
    toast.success('Regra excluída!');
  }

  const limitLabel = rules.limit === Infinity ? 'ilimitadas' : `${rules.activeCount}/${rules.limit}`;

  return (
    <div className="flex flex-col gap-4 p-4 pb-24">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sliders className="h-5 w-5 text-muted-foreground" />
          <h1 className="text-lg font-semibold">Regras de Categorização</h1>
        </div>
        <Button
          size="sm"
          onClick={() => setCreateOpen(true)}
          disabled={rules.atLimit}
          aria-label="Criar nova regra"
        >
          <Plus className="h-4 w-4 mr-1" />
          Nova regra
        </Button>
      </div>

      {/* Plan badge */}
      <p className="text-sm text-muted-foreground">
        Regras ativas: <span className="font-medium">{limitLabel}</span>
        {rules.atLimit && (
          <span className="ml-2 text-amber-600">· Limite atingido — faça upgrade para Pro</span>
        )}
      </p>

      <p className="text-sm text-muted-foreground -mt-2">
        Regras têm prioridade máxima: são aplicadas antes da IA em todas as importações.
      </p>

      {/* Loading */}
      {rules.isLoading && (
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-14 w-full rounded-lg" />
          ))}
        </div>
      )}

      {/* Error */}
      {rules.error && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
          {rules.error}
        </div>
      )}

      {/* Empty state */}
      {!rules.isLoading && !rules.error && rules.data.length === 0 && (
        <div className="flex flex-col items-center gap-3 py-12 text-center">
          <Sliders className="h-10 w-10 text-muted-foreground/40" />
          <p className="font-medium">Nenhuma regra criada</p>
          <p className="text-sm text-muted-foreground max-w-xs">
            Crie regras para que transações específicas sejam sempre categorizadas automaticamente.
          </p>
          <Button size="sm" onClick={() => setCreateOpen(true)}>
            <Plus className="h-4 w-4 mr-1" />
            Criar primeira regra
          </Button>
        </div>
      )}

      {/* Rules list */}
      {!rules.isLoading && rules.data.length > 0 && (
        <div className="space-y-2">
          {rules.data.map((rule) => (
            <RuleCard
              key={rule.id}
              rule={rule}
              onUpdate={handleUpdate}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}

      {/* Create dialog */}
      <RuleFormDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        title="Nova Regra"
        onSubmit={handleCreate}
      />
    </div>
  );
}
