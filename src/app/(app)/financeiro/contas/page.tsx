'use client';

import { useState, useEffect } from 'react';
import { Plus } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { ScheduledList } from '@/components/financeiro/scheduled-list';
import { ContasSummary } from '@/components/financeiro/contas-summary';
import { ScheduledForm } from '@/components/financeiro/scheduled-form';
import { useScheduledTransactions } from '@/hooks/use-scheduled-transactions';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { createBrowserClient } from '@supabase/ssr';

function useBankAccounts() {
  const [accounts, setAccounts] = useState<Array<{ id: string; bank_name: string }>>([]);

  useEffect(() => {
    const supabase = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    );
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return;
      supabase.from('bank_accounts').select('id, bank_name').eq('user_id', user.id).then(({ data }) => {
        if (data) setAccounts(data);
      });
    });
  }, []);

  return accounts;
}

export default function ContasPage() {
  const [formOpen, setFormOpen] = useState(false);
  const { data: allItems, create } = useScheduledTransactions({ status: undefined });
  const bankAccounts = useBankAccounts();

  const handleCreate = async (payload: Parameters<typeof create>[0]) => {
    try {
      await create(payload);
      toast.success('Agendamento criado!');
      setFormOpen(false);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Erro ao criar agendamento');
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold">Contas</h1>
        <Button size="sm" onClick={() => setFormOpen(true)}>
          <Plus className="mr-1.5 h-4 w-4" />
          Agendar
        </Button>
      </div>

      <ContasSummary items={allItems} />

      <Tabs defaultValue="pendentes">
        <TabsList className="w-full">
          <TabsTrigger value="pendentes" className="flex-1">Pendentes</TabsTrigger>
          <TabsTrigger value="pagas" className="flex-1">Pagas</TabsTrigger>
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
