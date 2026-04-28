'use client';

import { useState } from 'react';
import { Pencil, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { RuleFormDialog } from '@/components/categorization/rule-form-dialog';

const MATCH_TYPE_LABELS: Record<string, string> = {
  contains: 'contém',
  exact: 'igual a',
  starts_with: 'começa com',
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

type Rule = {
  id: string;
  pattern: string;
  match_type: 'contains' | 'exact' | 'starts_with';
  category: string;
  priority: number;
  active: boolean;
  updated_at?: string;
};

type Props = {
  rule: Rule;
  onUpdate: (id: string, updates: Partial<Rule>) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
};

export function RuleCard({ rule, onUpdate, onDelete }: Props) {
  const [editOpen, setEditOpen] = useState(false);
  const [toggling, setToggling] = useState(false);
  const [deleting, setDeleting] = useState(false);

  async function handleToggle(checked: boolean) {
    setToggling(true);
    try {
      await onUpdate(rule.id, { active: checked });
    } finally {
      setToggling(false);
    }
  }

  async function handleDelete() {
    if (!confirm(`Excluir regra "${rule.pattern}"?`)) return;
    setDeleting(true);
    try {
      await onDelete(rule.id);
    } finally {
      setDeleting(false);
    }
  }

  return (
    <>
      <div className={`flex items-center gap-3 rounded-lg border p-3 ${rule.active ? '' : 'opacity-50'}`}>
        <Switch
          checked={rule.active}
          onCheckedChange={handleToggle}
          disabled={toggling}
          aria-label={`${rule.active ? 'Desativar' : 'Ativar'} regra ${rule.pattern}`}
        />

        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-1.5 text-sm">
            <span className="text-muted-foreground text-xs">{MATCH_TYPE_LABELS[rule.match_type]}</span>
            <span className="font-mono font-medium truncate">{rule.pattern}</span>
            <span className="text-muted-foreground text-xs">→</span>
            <Badge variant="secondary" className="text-xs">
              {CATEGORY_LABELS[rule.category] ?? rule.category}
            </Badge>
          </div>
          {rule.priority > 0 && (
            <p className="text-xs text-muted-foreground mt-0.5">Prioridade: {rule.priority}</p>
          )}
        </div>

        <div className="flex items-center gap-1 shrink-0">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => setEditOpen(true)}
            aria-label={`Editar regra ${rule.pattern}`}
          >
            <Pencil className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-destructive hover:text-destructive"
            onClick={handleDelete}
            disabled={deleting}
            aria-label={`Excluir regra ${rule.pattern}`}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <RuleFormDialog
        key={`${rule.id}-${rule.updated_at}`}
        open={editOpen}
        onOpenChange={setEditOpen}
        title="Editar Regra"
        initialValues={rule}
        onSubmit={async (values) => {
          await onUpdate(rule.id, values);
        }}
      />
    </>
  );
}
