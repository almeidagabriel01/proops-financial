'use client';

import { useState } from 'react';
import { usePlan } from '@/hooks/use-plan';
import { useUser } from '@/hooks/use-user';
import { Button } from '@/components/ui/button';
import { useSearchParams, useRouter } from 'next/navigation';

// Note: metadata export doesn't work in 'use client' — moved to separate layout if needed
// For now, page title is set in the <title> via head
const TABS = ['perfil', 'plano'] as const;
type Tab = (typeof TABS)[number];

function ProfileTab() {
  const { user, profile } = useUser();

  return (
    <div className="space-y-4">
      <div>
        <label className="mb-1 block text-sm font-medium text-muted-foreground">E-mail</label>
        <p className="text-sm text-foreground">{user?.email ?? '—'}</p>
      </div>
      <div>
        <label className="mb-1 block text-sm font-medium text-muted-foreground">Nome</label>
        <p className="text-sm text-foreground">{profile?.display_name ?? '—'}</p>
      </div>
    </div>
  );
}

function PlanTab() {
  const { isPro, isBasic, inTrial, trialDaysLeft, aiMonthlyLimit, maxBankAccounts } = usePlan();
  const router = useRouter();

  const planLabel = isPro ? 'Pro' : 'Basic';
  const planPrice = isPro ? 'R$49,90/mês' : 'R$19,90/mês';

  return (
    <div className="space-y-4">
      {/* Current plan */}
      <div className="rounded-xl border border-border bg-card p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-muted-foreground">Plano atual</p>
            <p className="mt-0.5 text-xl font-bold text-foreground">{planLabel}</p>
            <p className="text-sm text-muted-foreground">{planPrice}</p>
          </div>
          {isPro && (
            <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
              Ativo
            </span>
          )}
        </div>

        {inTrial && (
          <p className="mt-3 text-sm text-amber-700 dark:text-amber-300">
            Período de teste Pro — {trialDaysLeft} {trialDaysLeft === 1 ? 'dia restante' : 'dias restantes'}
          </p>
        )}
      </div>

      {/* Plan limits */}
      <div className="rounded-xl border border-border bg-card p-4">
        <p className="mb-3 text-sm font-semibold text-foreground">Seus limites</p>
        <ul className="space-y-2 text-sm text-muted-foreground">
          <li className="flex justify-between">
            <span>Contas bancárias</span>
            <span className="font-medium text-foreground">
              {maxBankAccounts === Infinity ? 'Ilimitadas' : maxBankAccounts}
            </span>
          </li>
          <li className="flex justify-between">
            <span>Mensagens IA por mês</span>
            <span className="font-medium text-foreground">{aiMonthlyLimit}</span>
          </li>
        </ul>
      </div>

      {/* Upgrade CTA for Basic */}
      {isBasic && (
        <div className="rounded-xl border border-primary/20 bg-primary/5 p-4">
          <p className="text-sm font-semibold text-foreground">Faça upgrade para o Pro</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Acesso a ações por IA, entrada por áudio, contas ilimitadas e muito mais.
          </p>
          <Button
            className="mt-3 w-full"
            onClick={() => router.push('/settings?tab=plano#checkout')}
          >
            Ver plano Pro — R$49,90/mês
          </Button>
        </div>
      )}

      {/* Subscription management placeholder */}
      <div className="rounded-xl border border-border bg-muted/20 p-4 text-center">
        <p className="text-sm text-muted-foreground">
          Gerenciamento de assinatura disponível em breve
        </p>
      </div>
    </div>
  );
}

export default function SettingsPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const initialTab = (searchParams.get('tab') as Tab) ?? 'perfil';
  const [activeTab, setActiveTab] = useState<Tab>(
    TABS.includes(initialTab) ? initialTab : 'perfil'
  );

  function handleTabChange(tab: Tab) {
    setActiveTab(tab);
    router.replace(`/settings?tab=${tab}`, { scroll: false });
  }

  return (
    <div className="mx-auto max-w-screen-sm px-4 py-6">
      <div className="mb-6">
        <h1 className="text-xl font-bold text-foreground">Configurações</h1>
      </div>

      {/* Tab selector */}
      <div className="mb-6 flex rounded-lg border border-border bg-muted/30 p-1">
        {TABS.map((tab) => (
          <button
            key={tab}
            onClick={() => handleTabChange(tab)}
            className={`flex-1 rounded-md py-1.5 text-sm font-medium capitalize transition-colors ${
              activeTab === tab
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            {tab === 'perfil' ? 'Perfil' : 'Plano'}
          </button>
        ))}
      </div>

      {activeTab === 'perfil' ? <ProfileTab /> : <PlanTab />}
    </div>
  );
}
