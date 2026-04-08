'use client';

import { useMemo } from 'react';
import { Button } from '@/components/ui/button';

interface StepWelcomeProps {
  userName: string;
  trialEndsAt: string | null;
  onNext: () => void;
  onSkipAll: () => void;
}

export function StepWelcome({ userName, trialEndsAt, onNext, onSkipAll }: StepWelcomeProps) {
  const displayName = userName.includes('@') ? userName.split('@')[0] : userName;

  const { isInTrial, trialDaysLeft } = useMemo(() => {
    const now = new Date();
    const ends = trialEndsAt ? new Date(trialEndsAt) : null;
    const inTrial = ends ? ends > now : false;
    const daysLeft = inTrial && ends
      ? Math.ceil((ends.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
      : 0;
    return { isInTrial: inTrial, trialDaysLeft: daysLeft };
  }, [trialEndsAt]);

  return (
    <div className="flex flex-col items-center gap-6 text-center">
      {/* Illustration */}
      <div className="flex h-24 w-24 items-center justify-center rounded-full bg-primary/10">
        <svg
          className="h-12 w-12 text-primary"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={1.5}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z"
          />
        </svg>
      </div>

      {/* Greeting */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">
          Olá, {displayName}! 👋
        </h1>
        <p className="mt-2 text-muted-foreground">
          Bem-vindo ao Finansim. Aqui você vai importar seus extratos bancários, ver onde gasta seu dinheiro e conversar com uma IA que entende suas finanças.
        </p>
      </div>

      {/* Trial badge */}
      {isInTrial && (
        <div className="flex items-center gap-2 rounded-full bg-amber-50 px-4 py-2 text-sm text-amber-700 dark:bg-amber-900/20 dark:text-amber-400">
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
          </svg>
          {trialDaysLeft > 1
            ? `Trial Pro ativo — ${trialDaysLeft} dias restantes`
            : 'Trial Pro ativo — último dia!'}
        </div>
      )}

      {/* Steps preview */}
      <div className="w-full rounded-xl border border-border bg-muted/30 p-4 text-left">
        <p className="mb-3 text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Em 3 passos você vai:
        </p>
        <ul className="flex flex-col gap-2 text-sm text-foreground">
          <li className="flex items-center gap-2">
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">1</span>
            Importar seu extrato bancário
          </li>
          <li className="flex items-center gap-2">
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">2</span>
            Ver suas despesas organizadas por categoria
          </li>
          <li className="flex items-center gap-2">
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">3</span>
            Perguntar para a IA sobre seus gastos
          </li>
        </ul>
      </div>

      {/* CTAs */}
      <div className="flex w-full flex-col gap-3">
        <Button size="lg" className="w-full" onClick={onNext}>
          Vamos começar
        </Button>
        <button
          type="button"
          onClick={onSkipAll}
          className="text-sm text-muted-foreground underline-offset-2 hover:underline"
        >
          Pular onboarding e ir direto ao Dashboard
        </button>
      </div>
    </div>
  );
}
