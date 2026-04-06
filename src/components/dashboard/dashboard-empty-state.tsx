'use client'

import Link from 'next/link';
import { FileUp } from 'lucide-react';
import { buttonVariants } from '@/components/ui/button';

export function DashboardEmptyState() {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-border py-16 text-center">
      <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-muted">
        <FileUp className="h-8 w-8 text-muted-foreground" />
      </div>
      <h2 className="mb-1 text-lg font-semibold text-foreground">Nenhuma transação ainda</h2>
      <p className="mb-6 max-w-xs text-sm text-muted-foreground">
        Importe seu primeiro extrato bancário para visualizar seu resumo financeiro aqui.
      </p>
      <Link href="/import" className={buttonVariants()}>
        Importar meu primeiro extrato
      </Link>
    </div>
  );
}
