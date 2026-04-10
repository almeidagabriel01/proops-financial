'use client';

import { useState } from 'react';
import { Plus } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { ScheduledList } from '@/components/financeiro/scheduled-list';
import { ContasSummary } from '@/components/financeiro/contas-summary';
import { ScheduledForm } from '@/components/financeiro/scheduled-form';
import { useScheduledTransactions } from '@/hooks/use-scheduled-transactions';
import { useBankAccounts } from '@/hooks/use-bank-accounts';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';

export default function ContasPage() {
  const [formOpen, setFormOpen] = useState(false);
  const { data: allItems, create, isLoading, error } = useScheduledTransactions({ status: undefined });
  const { accounts: bankAccounts } = useBankAccounts();

  const pendingCount = allItems.filter((i) => i.status === 'pending' || i.status === 'overdue').length;

  const handleCreate = async (payload: Parameters<typeof create>[0]) => {
    try {
      await create(payload);
      toast.success('Agendamento criado!');
      setFormOpen(false);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Erro ao criar agendamento');
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="hidden lg:flex items-center justify-between">
          <Skeleton className="h-8 w-32" />
          <Skeleton className="h-9 w-36 rounded-xl" />
        </div>
        <Skeleton className="h-24 rounded-xl" />
        <div className="flex gap-2">
          <Skeleton className="h-8 w-24 rounded-lg" />
          <Skeleton className="h-8 w-24 rounded-lg" />
        </div>
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-16 rounded-xl" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {error && (
        <div className="rounded-lg border border-destructive/20 bg-destructive/5 p-3 text-sm text-destructive">
          {error}
        </div>
      )}
      {/* Desktop hero */}
      <div className="hidden lg:flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Contas</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {pendingCount > 0
              ? `${pendingCount} conta${pendingCount !== 1 ? 's' : ''} pendente${pendingCount !== 1 ? 's' : ''}`
              : 'Gerencie suas contas a pagar e receber'}
          </p>
        </div>
        <Button onClick={() => setFormOpen(true)}>
          <Plus className="mr-1.5 h-4 w-4" />
          Agendar conta
        </Button>
      </div>

      {/* Mobile header */}
      <div className="flex items-center justify-between lg:hidden">
        <h1 className="text-lg font-semibold">Contas</h1>
        <Button size="sm" onClick={() => setFormOpen(true)}>
          <Plus className="mr-1.5 h-4 w-4" />
          Agendar
        </Button>
      </div>

      <ContasSummary items={allItems} />

      <Tabs defaultValue="pendentes">
        <TabsList className="w-full lg:w-auto">
          <TabsTrigger value="pendentes" className="flex-1 lg:flex-none lg:px-6">Pendentes</TabsTrigger>
          <TabsTrigger value="pagas" className="flex-1 lg:flex-none lg:px-6">Pagas</TabsTrigger>
        </TabsList>
        <TabsContent value="pendentes" className="mt-3">
          <ScheduledList filter="pending" />
        </TabsContent>
        <TabsContent value="pagas" className="mt-3">
          <ScheduledList filter="paid" />
        </TabsContent>
      </Tabs>

      <ScheduledForm
        open={formOpen}
        onClose={() => setFormOpen(false)}
        onSubmit={(payload) => handleCreate(payload)}
        bankAccounts={bankAccounts}
      />
    </div>
  );
}
