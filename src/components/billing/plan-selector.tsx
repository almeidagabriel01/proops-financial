'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';

interface PlanSelectorProps {
  /** Mostrar apenas o botão de upgrade sem os 3 cards completos */
  compact?: boolean;
}

export function PlanSelector({ compact = false }: PlanSelectorProps) {
  const [loading, setLoading] = useState<string | null>(null);

  async function handleSelect(planKey: string, withTrial: boolean) {
    const key = `${planKey}-${withTrial}`;
    setLoading(key);
    try {
      const res = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ planKey, withTrial }),
      });
      const data = await res.json() as { checkoutUrl?: string; error?: string };
      if (data.checkoutUrl) {
        window.location.href = data.checkoutUrl;
      }
    } finally {
      setLoading(null);
    }
  }

  if (compact) {
    return (
      <div className="flex flex-col gap-3 sm:flex-row">
        <Button
          onClick={() => handleSelect('pro_monthly', true)}
          disabled={loading !== null}
          className="flex-1"
        >
          {loading === 'pro_monthly-true' ? 'Aguarde...' : 'Testar Pro 7 dias grátis'}
        </Button>
        <Button
          variant="outline"
          onClick={() => handleSelect('basic_monthly', false)}
          disabled={loading !== null}
          className="flex-1"
        >
          {loading === 'basic_monthly-false' ? 'Aguarde...' : 'Assinar Basic'}
        </Button>
      </div>
    );
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 sm:max-w-2xl sm:mx-auto w-full">
      {/* Basic */}
      <div className="flex flex-col rounded-2xl border border-border bg-card p-6">
        <p className="mb-1 text-xs font-bold uppercase tracking-wider text-muted-foreground">Basic</p>
        <div className="mb-1 flex items-baseline gap-0.5">
          <span className="text-3xl font-bold tracking-tight text-foreground">R$ 19</span>
          <span className="text-lg font-bold text-foreground">,90</span>
          <span className="ml-1 text-sm text-muted-foreground">/mês</span>
        </div>
        <p className="mb-4 text-sm text-muted-foreground">Sem trial. Assine agora.</p>
        <Button
          variant="outline"
          onClick={() => handleSelect('basic_monthly', false)}
          disabled={loading !== null}
          className="mt-auto"
        >
          {loading === 'basic_monthly-false' ? 'Aguarde...' : 'Assinar Basic'}
        </Button>
      </div>

      {/* Pro */}
      <div className="relative flex flex-col rounded-2xl bg-foreground p-6 text-background">
        <div className="absolute -top-3 left-6">
          <span className="inline-flex items-center rounded-full bg-primary px-3 py-0.5 text-xs font-bold text-primary-foreground">
            Mais popular
          </span>
        </div>
        <p className="mb-1 text-xs font-bold uppercase tracking-wider opacity-60">Pro</p>
        <div className="mb-1 flex items-baseline gap-0.5">
          <span className="text-3xl font-bold tracking-tight">R$ 49</span>
          <span className="text-lg font-bold">,90</span>
          <span className="ml-1 text-sm opacity-60">/mês</span>
        </div>
        <p className="mb-4 text-sm opacity-70">7 dias grátis com cartão, depois R$49,90/mês.</p>
        <Button
          onClick={() => handleSelect('pro_monthly', true)}
          disabled={loading !== null}
          className="mt-auto bg-background text-foreground hover:bg-background/90"
        >
          {loading === 'pro_monthly-true' ? 'Aguarde...' : 'Testar 7 dias grátis'}
        </Button>
        <button
          type="button"
          onClick={() => handleSelect('pro_monthly', false)}
          disabled={loading !== null}
          className="mt-2 text-center text-xs opacity-60 hover:opacity-90 transition-opacity disabled:pointer-events-none"
        >
          {loading === 'pro_monthly-false' ? 'Aguarde...' : 'Assinar sem trial'}
        </button>
      </div>
    </div>
  );
}
