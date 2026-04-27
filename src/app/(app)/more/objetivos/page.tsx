'use client';

import { useState, useEffect } from 'react';
import { Target, Plus, Pencil, Trash2, TrendingUp, CheckCircle2, CalendarClock } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { formatCurrency, maskCurrency, parseCurrencyMask, initCurrencyMask } from '@/lib/utils/format';
import { DatePicker } from '@/components/ui/date-picker';
import { useGoals, type Goal } from '@/hooks/use-goals';
import { cn } from '@/lib/utils';

function formatDate(d: string) {
  const [y, m, day] = d.split('-');
  return `${day}/${m}/${y}`;
}

function getDeadlineInfo(deadline: string): { status: 'urgent' | 'soon' | 'ok'; daysLeft: number } {
  const today = new Date();
  const due = new Date(deadline + 'T12:00:00');
  const diffDays = Math.ceil((due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  const status = diffDays < 0 ? 'urgent' : diffDays <= 30 ? 'soon' : 'ok';
  return { status, daysLeft: diffDays };
}

interface GoalFormData {
  name: string;
  target_amount: string;
  current_amount: string;
  deadline: string;
}

const EMPTY_FORM: GoalFormData = { name: '', target_amount: '', current_amount: '', deadline: '' };

function goalToForm(goal: Goal): GoalFormData {
  return {
    name: goal.name,
    target_amount: initCurrencyMask(goal.target_amount),
    current_amount: initCurrencyMask(goal.current_amount),
    deadline: goal.deadline,
  };
}

interface GoalDialogProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: { name: string; target_amount: number; current_amount: number; deadline: string }) => Promise<void>;
  initial?: GoalFormData;
  title: string;
}

function GoalDialog({ open, onClose, onSubmit, initial = EMPTY_FORM, title }: GoalDialogProps) {
  const [form, setForm] = useState<GoalFormData>(initial);
  const [saving, setSaving] = useState(false);

  useEffect(() => { setForm(initial); }, [initial]);

  function set(field: keyof GoalFormData, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim()) { toast.error('Informe o nome do objetivo'); return; }
    const target = parseCurrencyMask(form.target_amount);
    if (!target || target <= 0) { toast.error('Informe o valor da meta'); return; }
    if (!form.deadline) { toast.error('Informe o prazo'); return; }
    const current = parseCurrencyMask(form.current_amount) || 0;
    setSaving(true);
    try {
      await onSubmit({ name: form.name.trim(), target_amount: target, current_amount: current, deadline: form.deadline });
      onClose();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro ao salvar objetivo');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <form onSubmit={(e) => void handleSubmit(e)} className="space-y-4 pt-2">
          <div>
            <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
              Nome do objetivo
            </label>
            <Input
              placeholder="Ex: Fundo de emergência, Viagem, Carro..."
              value={form.name}
              onChange={(e) => set('name', e.target.value)}
              maxLength={100}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
                Meta (R$)
              </label>
              <Input
                placeholder="0,00"
                value={form.target_amount}
                onChange={(e) => set('target_amount', maskCurrency(e.target.value))}
                inputMode="decimal"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
                Já economizado (R$)
              </label>
              <Input
                placeholder="0,00"
                value={form.current_amount}
                onChange={(e) => set('current_amount', maskCurrency(e.target.value))}
                inputMode="decimal"
              />
            </div>
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Prazo</label>
            <DatePicker
              value={form.deadline}
              onChange={(v) => set('deadline', v)}
              min={new Date().toISOString().slice(0, 10)}
              placeholder="Selecionar prazo"
            />
          </div>
          <div className="flex gap-2 pt-1">
            <Button type="button" variant="outline" className="flex-1" onClick={onClose} disabled={saving}>
              Cancelar
            </Button>
            <Button type="submit" className="flex-1" disabled={saving}>
              {saving ? 'Salvando...' : 'Salvar'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

interface ProgressDialogProps {
  open: boolean;
  onClose: () => void;
  goal: Goal;
  onSubmit: (amount: number) => Promise<void>;
}

function ProgressDialog({ open, onClose, goal, onSubmit }: ProgressDialogProps) {
  const [value, setValue] = useState(initCurrencyMask(goal.current_amount));
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const amount = parseCurrencyMask(value);
    if (isNaN(amount) || amount < 0) { toast.error('Valor inválido'); return; }
    setSaving(true);
    try {
      await onSubmit(amount);
      onClose();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro ao atualizar');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Atualizar progresso</DialogTitle>
        </DialogHeader>
        <form onSubmit={(e) => void handleSubmit(e)} className="space-y-4 pt-2">
          <p className="text-sm text-muted-foreground">
            Meta:{' '}
            <span className="font-medium text-foreground">{goal.name}</span>
            {' '}— {formatCurrency(goal.target_amount)}
          </p>
          <div>
            <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
              Valor já economizado (R$)
            </label>
            <Input
              value={value}
              onChange={(e) => setValue(maskCurrency(e.target.value))}
              inputMode="decimal"
              placeholder="0,00"
            />
          </div>
          <div className="flex gap-2">
            <Button type="button" variant="outline" className="flex-1" onClick={onClose} disabled={saving}>
              Cancelar
            </Button>
            <Button type="submit" className="flex-1" disabled={saving}>
              {saving ? 'Salvando...' : 'Atualizar'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export default function ObjetivosPage() {
  const { data: goals, isLoading, error, create, update, markComplete: hookMarkComplete, remove: hookRemove } = useGoals();

  const [createOpen, setCreateOpen] = useState(false);
  const [editGoal, setEditGoal] = useState<Goal | null>(null);
  const [progressGoal, setProgressGoal] = useState<Goal | null>(null);

  const markComplete = async (id: string) => {
    try {
      await hookMarkComplete(id);
      toast.success('Objetivo concluído! 🎉');
    } catch {
      toast.error('Erro ao concluir objetivo');
    }
  };

  const remove = async (id: string) => {
    try {
      await hookRemove(id);
      toast.success('Objetivo excluído');
    } catch {
      toast.error('Erro ao excluir objetivo');
    }
  };

  if (isLoading) {
    return (
      <div className="h-full overflow-y-auto">
        <div className="p-4 space-y-3 lg:px-8 lg:py-6">
          <div className="flex items-center justify-between">
            <Skeleton className="h-8 w-32" />
            <Skeleton className="h-9 w-36" />
          </div>
          {Array.from({ length: 2 }).map((_, i) => (
            <Skeleton key={i} className="h-40 w-full rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="h-full overflow-y-auto">
        <div className="p-4 lg:px-8 lg:py-6">
          <div className="rounded-lg border border-destructive/20 bg-destructive/5 p-4 text-sm text-destructive">
            {error}
          </div>
        </div>
      </div>
    );
  }

  const active = goals.filter((g) => g.status === 'active');
  const done = goals.filter((g) => g.status !== 'active');

  return (
    <div className="h-full overflow-y-auto">
      <div className="mx-auto w-full p-4 pb-24 space-y-4 lg:px-8 lg:py-6 lg:pb-28">
        {/* Desktop hero */}
        <div className="hidden lg:flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Objetivos</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {active.length} {active.length === 1 ? 'objetivo ativo' : 'objetivos ativos'}
              {done.length > 0 && ` • ${done.length} concluído${done.length !== 1 ? 's' : ''}`}
            </p>
          </div>
          <Button onClick={() => setCreateOpen(true)} className="gap-2">
            <Plus className="h-4 w-4" />
            Novo objetivo
          </Button>
        </div>

        {/* Mobile header */}
        <div className="flex items-center justify-between lg:hidden">
          <h1 className="text-lg font-semibold">Objetivos</h1>
          <Button size="sm" onClick={() => setCreateOpen(true)} className="gap-1.5">
            <Plus className="h-4 w-4" />
            Novo
          </Button>
        </div>

        {active.length === 0 && done.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-3 py-14 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-muted/50">
              <Target className="h-8 w-8 text-muted-foreground/50" />
            </div>
            <div>
              <p className="text-sm font-medium text-foreground">Nenhum objetivo definido</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Crie metas financeiras para acompanhar seu progresso.
              </p>
            </div>
            <Button onClick={() => setCreateOpen(true)} variant="outline" className="gap-2 mt-1">
              <Plus className="h-4 w-4" />
              Criar primeiro objetivo
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Ativos */}
            {active.length > 0 && (
              <div className="grid grid-cols-1 gap-3 lg:grid-cols-2 lg:gap-4">
                {active.map((goal) => {
                  const pct = Math.min(100, Math.round((goal.current_amount / goal.target_amount) * 100));
                  const { status: deadlineStatus, daysLeft } = getDeadlineInfo(goal.deadline);
                  const remaining = goal.target_amount - goal.current_amount;

                  return (
                    <Card
                      key={goal.id}
                      className="p-4 space-y-3 lg:shadow-[var(--shadow-elevated)] lg:hover:shadow-[var(--shadow-float)] lg:hover:-translate-y-0.5 lg:transition-all"
                    >
                      {/* Header: nome + badge de prazo */}
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-sm font-semibold lg:text-base leading-snug">{goal.name}</p>
                        <span
                          className={cn(
                            'shrink-0 rounded-full px-2 py-0.5 text-[11px] font-medium whitespace-nowrap',
                            deadlineStatus === 'urgent'
                              ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                              : deadlineStatus === 'soon'
                                ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
                                : 'bg-muted text-muted-foreground',
                          )}
                        >
                          {deadlineStatus === 'urgent'
                            ? 'Vencido'
                            : deadlineStatus === 'soon'
                              ? `${daysLeft}d restantes`
                              : formatDate(goal.deadline)}
                        </span>
                      </div>

                      {/* Barra de progresso */}
                      <Progress value={pct} className="h-2" />

                      {/* Valores: economizado / meta */}
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-muted-foreground">
                          {formatCurrency(goal.current_amount)} economizado
                        </span>
                        <span className="font-semibold tabular-nums">
                          {pct}%{' '}
                          <span className="font-normal text-muted-foreground">
                            de {formatCurrency(goal.target_amount)}
                          </span>
                        </span>
                      </div>

                      {/* Faltam X */}
                      {remaining > 0 && (
                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                          <CalendarClock className="h-3.5 w-3.5 shrink-0" />
                          <span>Faltam {formatCurrency(remaining)} para a meta</span>
                        </div>
                      )}

                      {/* Ações */}
                      <div className="flex gap-1.5 pt-0.5 border-t border-border/50">
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-8 flex-1 gap-1.5 text-xs"
                          onClick={() => setProgressGoal(goal)}
                        >
                          <TrendingUp className="h-3.5 w-3.5" />
                          Progresso
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-8 flex-1 gap-1.5 text-xs"
                          onClick={() => void markComplete(goal.id)}
                        >
                          <CheckCircle2 className="h-3.5 w-3.5" />
                          Concluir
                        </Button>
                        <div className="flex items-center gap-0.5 pl-1 border-l border-border/50">
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-8 w-8 p-0 shrink-0"
                            onClick={() => setEditGoal(goal)}
                            aria-label="Editar objetivo"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-8 w-8 p-0 shrink-0 text-destructive hover:bg-destructive/10"
                            onClick={() => void remove(goal.id)}
                            aria-label="Excluir objetivo"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </div>
                    </Card>
                  );
                })}
              </div>
            )}

            {/* Concluídos */}
            {done.length > 0 && (
              <div>
                <p className="mb-2 text-xs font-medium text-muted-foreground">Concluídos</p>
                <div className="grid grid-cols-1 gap-2 lg:grid-cols-2">
                  {done.map((goal) => (
                    <Card key={goal.id} className="flex items-center gap-3 p-3 opacity-60">
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/30">
                        <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">{goal.name}</p>
                        <p className="text-xs text-muted-foreground">{formatCurrency(goal.target_amount)}</p>
                      </div>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 w-7 shrink-0 p-0 text-destructive hover:bg-destructive/10"
                        onClick={() => void remove(goal.id)}
                        aria-label="Excluir objetivo"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </Card>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {createOpen && (
        <GoalDialog
          open={createOpen}
          onClose={() => setCreateOpen(false)}
          title="Novo objetivo"
          onSubmit={async (data) => {
            await create(data);
            toast.success('Objetivo criado!');
          }}
        />
      )}

      {editGoal && (
        <GoalDialog
          open={!!editGoal}
          onClose={() => setEditGoal(null)}
          title="Editar objetivo"
          initial={goalToForm(editGoal)}
          onSubmit={async (data) => {
            await update(editGoal.id, data);
            toast.success('Objetivo atualizado!');
          }}
        />
      )}

      {progressGoal && (
        <ProgressDialog
          open={!!progressGoal}
          onClose={() => setProgressGoal(null)}
          goal={progressGoal}
          onSubmit={async (amount) => {
            await update(progressGoal.id, { current_amount: amount });
            toast.success('Progresso atualizado!');
          }}
        />
      )}
    </div>
  );
}
