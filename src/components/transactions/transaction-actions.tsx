'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { MoreVertical, Pencil, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { TransactionForm } from '@/components/transactions/transaction-form';
import { DeleteConfirmDialog } from '@/components/transactions/delete-confirm-dialog';
import type { Transaction } from '@/hooks/use-transactions';

interface TransactionActionsProps {
  transaction: Transaction;
  onMutated: () => void;
}

export function TransactionActions({ transaction, onMutated }: TransactionActionsProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  async function handleDelete() {
    const response = await fetch(`/api/transactions/${transaction.id}`, {
      method: 'DELETE',
    });

    if (!response.ok && response.status !== 204) {
      const data = await response.json().catch(() => ({}));
      throw new Error(data.error ?? 'Erro ao excluir');
    }

    toast.success('Transação excluída');
    onMutated();
    setDeleteOpen(false);
  }

  return (
    <>
      {/* Menu trigger */}
      <div className="relative">
        <Button
          variant="ghost"
          size="sm"
          className="h-8 w-8 p-0"
          aria-label="Opções"
          onClick={() => setMenuOpen((o) => !o)}
        >
          <MoreVertical className="h-4 w-4" />
        </Button>

        {menuOpen && (
          <>
            {/* Backdrop */}
            <div
              className="fixed inset-0 z-10"
              onClick={() => setMenuOpen(false)}
            />
            {/* Dropdown */}
            <div className="absolute right-0 z-20 mt-1 w-36 rounded-lg border border-border bg-popover shadow-md">
              <button
                className="flex w-full items-center gap-2 px-3 py-2 text-sm text-foreground hover:bg-accent"
                onClick={() => {
                  setMenuOpen(false);
                  setEditOpen(true);
                }}
              >
                <Pencil className="h-3.5 w-3.5" />
                Editar
              </button>
              <button
                className="flex w-full items-center gap-2 px-3 py-2 text-sm text-destructive hover:bg-accent"
                onClick={() => {
                  setMenuOpen(false);
                  setDeleteOpen(true);
                }}
              >
                <Trash2 className="h-3.5 w-3.5" />
                Excluir
              </button>
            </div>
          </>
        )}
      </div>

      <TransactionForm
        open={editOpen}
        onClose={() => setEditOpen(false)}
        onSuccess={onMutated}
        transaction={transaction}
      />

      <DeleteConfirmDialog
        open={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        onConfirm={handleDelete}
      />
    </>
  );
}
