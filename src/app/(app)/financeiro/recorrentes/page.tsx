'use client';

import { useState } from 'react';
import { Plus, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { RecurringItem } from '@/components/financeiro/recurring-item';
import { RecurringForm } from '@/components/financeiro/recurring-form';
import { useRecurringRules } from '@/hooks/use-recurring-rules';
import { useBankAccounts } from '@/hooks/use-bank-accounts';

export default function RecorrentesPage() {
  const [formOpen, setFormOpen] = useState(false);
  const { data, isLoading, error, create, updateStatus, remove } = useRecurringRules();
  const { accounts: bankAccounts } = useBankAccounts();

  const active = data.filter((r) => r.status === 'active');
  const paused = data.filter((r) => r.status === 'paused');
  const canceled = data.filter((r) => r.status === 'canceled');

  const handleCreate = async (payload: Parameters<typeof create>[0]) => {
    try {
      await create(payload);
      toast.success('Recorrente criado!');
      setFormOpen(false);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Erro ao criar recorrente');
    }
  };

  const handlePause = async (id: string) => {
    try {
      await updateStatus(id, 'paused');
      toast.success('Recorrente pausado');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Erro ao pausar');
    }
  };

  const handleResume = async (id: string) => {
    try {
      await updateStatus(id, 'active');
      toast.success('Recorrente reativado');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Erro ao reativar');
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await remove(id);
      toast.success('Recorrente excluído');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Erro ao excluir');
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-3">
        <h1 className="text-lg font-semibold lg:text-2xl lg:font-bold">Recorrentes</h1>
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-24 w-full rounded-xl" />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-3">
        <h1 className="text-lg font-semibold lg:text-2xl lg:font-bold">Recorrentes</h1>
        <div className="rounded-lg border border-destructive/20 bg-destructive/5 p-4 text-sm text-destructive">{error}</div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Desktop hero */}
      <div className="hidden lg:flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Recorrentes</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {active.length} {active.length === 1 ? 'regra ativa' : 'regras ativas'}
            {paused.length > 0 && ` • ${paused.length} pausada${paused.length !== 1 ? 's' : ''}`}
          </p>
        </div>
        <Button onClick={() => setFormOpen(true)}>
          <Plus className="mr-1.5 h-4 w-4" />
          Nova recorrente
        </Button>
      </div>

      {/* Mobile header */}
      <div className="flex items-center justify-between lg:hidden">
        <h1 className="text-lg font-semibold">Recorrentes</h1>
        <Button size="sm" onClick={() => setFormOpen(true)}>
          <Plus className="mr-1.5 h-4 w-4" />
          Nova
        </Button>
      </div>

      <Tabs defaultValue="ativas">
        <TabsList className="w-full lg:w-auto">
          <TabsTrigger value="ativas" className="flex-1 lg:flex-none lg:px-6">
            Ativas{' '}
            {active.length > 0 && (
              <span className="ml-1 rounded-full bg-primary/10 px-1.5 text-[10px] font-semibold text-primary">
                {active.length}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="pausadas" className="flex-1 lg:flex-none lg:px-6">Pausadas</TabsTrigger>
        </TabsList>

        <TabsContent value="ativas" className="mt-3 space-y-3">
          {active.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-2 py-10 text-center text-muted-foreground">
              <RefreshCw className="h-10 w-10 opacity-30" />
              <p className="text-sm font-medium">Nenhuma recorrente ativa</p>
              <p className="text-xs">
                Adicione despesas fixas como aluguel, assinaturas e receitas mensais como salário.
              </p>
            </div>
          ) : (
            <div className="space-y-3 lg:grid lg:grid-cols-2 lg:gap-4 lg:space-y-0">
              {active.map((rule) => (
                <RecurringItem
                  key={rule.id}
                  rule={rule}
                  onPause={() => void handlePause(rule.id)}
                  onResume={() => void handleResume(rule.id)}
                  onDelete={() => void handleDelete(rule.id)}
                />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="pausadas" className="mt-3 space-y-3">
          {paused.length === 0 && canceled.length === 0 ? (
            <div className="py-10 text-center text-sm text-muted-foreground">
              Nenhuma recorrente pausada ou cancelada
            </div>
          ) : (
            <div className="space-y-3 lg:grid lg:grid-cols-2 lg:gap-4 lg:space-y-0">
              {[...paused, ...canceled].map((rule) => (
                <RecurringItem
                  key={rule.id}
                  rule={rule}
                  onPause={() => void handlePause(rule.id)}
                  onResume={() => void handleResume(rule.id)}
                  onDelete={() => void handleDelete(rule.id)}
                />
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      <RecurringForm
        open={formOpen}
        onClose={() => setFormOpen(false)}
        onSubmit={(payload) => handleCreate(payload)}
        bankAccounts={bankAccounts}
      />
    </div>
  );
}
