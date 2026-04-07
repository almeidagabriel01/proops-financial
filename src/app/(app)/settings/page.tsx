'use client';

import { useState } from 'react';
import { usePlan } from '@/hooks/use-plan';
import { useUser } from '@/hooks/use-user';
import { Button } from '@/components/ui/button';
import { useSearchParams, useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

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
  const { profile, user } = useUser();
  const [cancelConfirm, setCancelConfirm] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const planLabel = isPro ? 'Pro' : 'Basic';
  const planPrice = isPro ? 'R$49,90/mês' : 'R$19,90/mês';

  async function handleUpgrade(planKey: 'basic_monthly' | 'pro_monthly') {
    setActionLoading(true);
    setActionError(null);
    try {
      const res = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ planKey }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Erro ao iniciar checkout');
      if (data.checkoutUrl) {
        window.open(data.checkoutUrl, '_blank', 'noopener,noreferrer');
      }
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Erro desconhecido');
    } finally {
      setActionLoading(false);
    }
  }

  async function handleCancelSubscription() {
    setActionLoading(true);
    setActionError(null);
    try {
      const supabase = createClient();
      // Fetch active subscription for this user
      const { data: sub, error } = await supabase
        .from('subscriptions')
        .select('asaas_subscription_id')
        .eq('user_id', user!.id)
        .in('status', ['active', 'past_due'])
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) throw new Error(error.message);
      if (!sub?.asaas_subscription_id) throw new Error('Assinatura não encontrada');

      const res = await fetch(`/api/checkout/cancel`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subscriptionId: sub.asaas_subscription_id }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Erro ao cancelar');

      setCancelConfirm(false);
      // Refresh page so plan status reflects cancellation
      window.location.reload();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Erro ao cancelar assinatura');
    } finally {
      setActionLoading(false);
    }
  }

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
          {isPro && !inTrial && (
            <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
              Ativo
            </span>
          )}
          {inTrial && (
            <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-700 dark:bg-amber-900/30 dark:text-amber-300">
              Trial
            </span>
          )}
        </div>

        {inTrial && (
          <div className="mt-3">
            <p className="text-sm text-amber-700 dark:text-amber-300">
              Período de teste Pro — {trialDaysLeft} {trialDaysLeft === 1 ? 'dia restante' : 'dias restantes'}
            </p>
            {profile?.trial_ends_at && (
              <p className="text-xs text-muted-foreground">
                Expira em{' '}
                {new Date(profile.trial_ends_at).toLocaleDateString('pt-BR', {
                  day: '2-digit',
                  month: 'long',
                })}
              </p>
            )}
          </div>
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
      {isBasic && !inTrial && (
        <div className="rounded-xl border border-primary/20 bg-primary/5 p-4">
          <p className="text-sm font-semibold text-foreground">Faça upgrade para o Pro</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Acesso a ações por IA, entrada por áudio, contas ilimitadas e muito mais.
          </p>
          <Button
            className="mt-3 w-full"
            disabled={actionLoading}
            onClick={() => handleUpgrade('pro_monthly')}
          >
            {actionLoading ? 'Aguarde...' : 'Assinar Pro — R$49,90/mês'}
          </Button>
        </div>
      )}

      {/* Pro subscription management */}
      {isPro && !inTrial && (
        <div className="rounded-xl border border-border bg-card p-4">
          <p className="mb-3 text-sm font-semibold text-foreground">Gerenciar assinatura</p>
          {!cancelConfirm ? (
            <Button
              variant="outline"
              className="w-full text-destructive hover:bg-destructive/5 hover:text-destructive"
              disabled={actionLoading}
              onClick={() => setCancelConfirm(true)}
            >
              Cancelar assinatura
            </Button>
          ) : (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">
                Tem certeza? Seu acesso Pro continuará até o final do período pago.
              </p>
              <div className="flex gap-2">
                <Button
                  variant="destructive"
                  className="flex-1"
                  disabled={actionLoading}
                  onClick={handleCancelSubscription}
                >
                  {actionLoading ? 'Cancelando...' : 'Confirmar cancelamento'}
                </Button>
                <Button
                  variant="outline"
                  className="flex-1"
                  disabled={actionLoading}
                  onClick={() => setCancelConfirm(false)}
                >
                  Manter assinatura
                </Button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Trial — CTA to subscribe */}
      {inTrial && (
        <div className="rounded-xl border border-primary/20 bg-primary/5 p-4">
          <p className="text-sm font-semibold text-foreground">Assinar antes do trial expirar</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Mantenha acesso Pro sem interrupção.
          </p>
          <Button
            className="mt-3 w-full"
            disabled={actionLoading}
            onClick={() => handleUpgrade('pro_monthly')}
          >
            {actionLoading ? 'Aguarde...' : 'Assinar Pro — R$49,90/mês'}
          </Button>
        </div>
      )}

      {actionError && (
        <p className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {actionError}
        </p>
      )}
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
