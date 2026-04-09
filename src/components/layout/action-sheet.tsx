'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Upload, CalendarClock, CreditCard, X } from 'lucide-react';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface ActionSheetProps {
  open: boolean;
  onClose: () => void;
  onNewTransaction?: () => void;
  onNewScheduled?: () => void;
  onNewInstallment?: () => void;
}

const actions = [
  {
    key: 'import',
    label: 'Importar Extrato',
    description: 'OFX ou CSV do seu banco',
    icon: Upload,
    href: '/import',
    color: 'bg-blue-500/10 text-blue-600 dark:text-blue-400',
  },
  {
    key: 'transaction',
    label: 'Nova Transação',
    description: 'Lançamento manual',
    icon: Plus,
    href: null,
    color: 'bg-primary/10 text-primary',
  },
  {
    key: 'scheduled',
    label: 'Agendar Conta',
    description: 'Conta a pagar ou receber',
    icon: CalendarClock,
    href: null,
    color: 'bg-amber-500/10 text-amber-600 dark:text-amber-400',
  },
  {
    key: 'installment',
    label: 'Nova Parcela',
    description: 'Compra parcelada no cartão',
    icon: CreditCard,
    href: null,
    color: 'bg-purple-500/10 text-purple-600 dark:text-purple-400',
  },
] as const;

export function ActionSheet({
  open,
  onClose,
  onNewTransaction,
  onNewScheduled,
  onNewInstallment,
}: ActionSheetProps) {
  const router = useRouter();

  const handleAction = (key: string, href: string | null) => {
    onClose();
    if (href) {
      router.push(href);
      return;
    }
    if (key === 'transaction') onNewTransaction?.();
    if (key === 'scheduled') onNewScheduled?.();
    if (key === 'installment') onNewInstallment?.();
  };

  return (
    <Sheet open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <SheetContent side="bottom" className="rounded-t-2xl pb-8">
        <div className="flex items-center justify-between pb-2 pt-1">
          <span className="text-base font-semibold">O que deseja fazer?</span>
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div className="mt-2 grid grid-cols-2 gap-3">
          {actions.map((action) => {
            const Icon = action.icon;
            return (
              <button
                key={action.key}
                type="button"
                className="flex flex-col items-start gap-2 rounded-xl border border-border bg-card p-4 text-left transition-colors active:bg-muted"
                onClick={() => handleAction(action.key, action.href)}
              >
                <span className={cn('flex h-9 w-9 items-center justify-center rounded-full', action.color)}>
                  <Icon className="h-4 w-4" />
                </span>
                <div>
                  <p className="text-sm font-medium">{action.label}</p>
                  <p className="text-xs text-muted-foreground">{action.description}</p>
                </div>
              </button>
            );
          })}
        </div>
      </SheetContent>
    </Sheet>
  );
}

/**
 * Botão FAB flutuante que abre o ActionSheet.
 * Usado no bottom-nav como tab central.
 */
export function FabButton({ className }: { className?: string }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        className={cn('flex -translate-y-3 flex-col items-center', className)}
        onClick={() => setOpen(true)}
        aria-label="Nova ação financeira"
      >
        <span className="flex h-12 w-12 items-center justify-center rounded-full bg-primary shadow-lg">
          <Plus className="h-6 w-6 text-primary-foreground" />
        </span>
        <span className="mt-1 text-[10px] font-medium text-primary">Novo</span>
      </button>

      <ActionSheet open={open} onClose={() => setOpen(false)} />
    </>
  );
}
