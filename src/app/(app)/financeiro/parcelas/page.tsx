'use client';

import { toast } from 'sonner';
import { CreditCard } from 'lucide-react';
import { InstallmentGroupCard } from '@/components/financeiro/installment-group-card';
import { Skeleton } from '@/components/ui/skeleton';
import { useInstallmentGroups } from '@/hooks/use-installment-groups';

export default function ParcelasPage() {
  const { data, isLoading, error, remove } = useInstallmentGroups();

  const handleDelete = async (id: string) => {
    try {
      await remove(id);
      toast.success('Grupo de parcelas excluído');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Erro ao excluir');
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-3">
        <h1 className="text-lg font-semibold lg:text-2xl lg:font-bold">Parcelas</h1>
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-32 w-full rounded-xl" />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-3">
        <h1 className="text-lg font-semibold lg:text-2xl lg:font-bold">Parcelas</h1>
        <div className="rounded-lg border border-destructive/20 bg-destructive/5 p-4 text-sm text-destructive">
          {error}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Desktop hero */}
      <div className="hidden lg:block">
        <h1 className="text-2xl font-bold text-foreground">Parcelas</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {data.length === 0
            ? 'Compras parceladas detectadas automaticamente na importação'
            : `${data.length} grupo${data.length !== 1 ? 's' : ''} de parcelas`}
        </p>
      </div>

      {/* Mobile header */}
      <div className="flex items-center justify-between lg:hidden">
        <h1 className="text-lg font-semibold">Parcelas</h1>
        <span className="text-sm text-muted-foreground">
          {data.length} grupo{data.length !== 1 ? 's' : ''}
        </span>
      </div>

      {data.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-2 py-10 text-center text-muted-foreground">
          <CreditCard className="h-10 w-10 opacity-30" />
          <p className="text-sm font-medium">Nenhuma compra parcelada</p>
          <p className="text-xs">
            Ao importar extratos com compras parceladas (ex: 3/10), as parcelas futuras serão
            detectadas automaticamente.
          </p>
        </div>
      ) : (
        <div className="space-y-3 lg:grid lg:grid-cols-2 lg:gap-4 lg:space-y-0">
          {data.map((group) => (
            <div
              key={group.id}
              className="lg:shadow-[var(--shadow-elevated)] lg:hover:shadow-[var(--shadow-float)] lg:hover:-translate-y-0.5 lg:transition-all lg:rounded-xl"
            >
              <InstallmentGroupCard
                group={group}
                onDelete={(id) => void handleDelete(id)}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
