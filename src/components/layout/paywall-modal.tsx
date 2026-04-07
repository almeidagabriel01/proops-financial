'use client';

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { CheckIcon, XIcon } from 'lucide-react';

interface PaywallModalProps {
  open: boolean;
  onClose: () => void;
  feature?: string;
}

const FEATURE_LABELS: Record<string, string> = {
  audio: 'Entrada por áudio',
  'function-calling': 'Ações por IA',
  chat: 'Chat IA',
  accounts: 'Contas bancárias ilimitadas',
};

type Row = {
  label: string;
  basic: string | boolean;
  pro: string | boolean;
};

const COMPARISON_ROWS: Row[] = [
  { label: 'Contas bancárias', basic: '3 contas', pro: 'Ilimitadas' },
  { label: 'Chat IA (consultas)', basic: '50/mês', pro: '200/mês' },
  { label: 'Chat IA (ações)', basic: false, pro: true },
  { label: 'Entrada por áudio', basic: false, pro: true },
  { label: 'Modelo de IA', basic: 'Haiku', pro: 'Sonnet' },
];

function Cell({ value }: { value: string | boolean }) {
  if (typeof value === 'boolean') {
    return value ? (
      <CheckIcon className="mx-auto h-4 w-4 text-green-500" />
    ) : (
      <XIcon className="mx-auto h-4 w-4 text-muted-foreground/40" />
    );
  }
  return <span>{value}</span>;
}

export function PaywallModal({ open, onClose, feature }: PaywallModalProps) {
  const featureLabel = feature ? (FEATURE_LABELS[feature] ?? feature) : null;
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleUpgrade() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ planKey: 'pro_monthly' }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Erro ao iniciar checkout');
      if (data.checkoutUrl) {
        window.open(data.checkoutUrl, '_blank', 'noopener,noreferrer');
      }
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro desconhecido');
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>
            {featureLabel ? `${featureLabel} requer plano Pro` : 'Faça upgrade para o Pro'}
          </DialogTitle>
          {featureLabel && (
            <DialogDescription>
              Assine o plano Pro para desbloquear esta e outras funcionalidades avançadas.
            </DialogDescription>
          )}
        </DialogHeader>

        {/* Comparison table */}
        <div className="overflow-hidden rounded-lg border border-border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/40">
                <th className="px-3 py-2 text-left font-medium text-muted-foreground">Feature</th>
                <th className="px-3 py-2 text-center font-medium">
                  <div>Basic</div>
                  <div className="text-xs font-normal text-muted-foreground">R$19,90/mês</div>
                </th>
                <th className="px-3 py-2 text-center font-medium text-primary">
                  <div>Pro</div>
                  <div className="text-xs font-normal text-muted-foreground">R$49,90/mês</div>
                </th>
              </tr>
            </thead>
            <tbody>
              {COMPARISON_ROWS.map((row, i) => (
                <tr
                  key={row.label}
                  className={i % 2 === 0 ? 'bg-background' : 'bg-muted/20'}
                >
                  <td className="px-3 py-2 text-muted-foreground">{row.label}</td>
                  <td className="px-3 py-2 text-center">
                    <Cell value={row.basic} />
                  </td>
                  <td className="px-3 py-2 text-center">
                    <Cell value={row.pro} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="flex flex-col gap-2">
          <Button onClick={handleUpgrade} disabled={loading} className="w-full">
            {loading ? 'Aguarde...' : 'Assinar Pro'}
          </Button>
          <Button variant="ghost" onClick={onClose} disabled={loading} className="w-full">
            Agora não
          </Button>
          {error && (
            <p className="rounded-lg bg-destructive/10 px-3 py-2 text-center text-sm text-destructive">
              {error}
            </p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
