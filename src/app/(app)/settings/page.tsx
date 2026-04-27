'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Skeleton } from '@/components/ui/skeleton';

import { usePlan } from '@/hooks/use-plan';
import { useUser } from '@/hooks/use-user';
import { Button } from '@/components/ui/button';
import { useSearchParams, useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { User, CreditCard, Shield } from 'lucide-react';
import { cn } from '@/lib/utils';

const TABS = ['perfil', 'plano', 'dados'] as const;
type Tab = (typeof TABS)[number];

const TAB_ICONS: Record<Tab, React.ReactNode> = {
  perfil: <User className="h-4 w-4" />,
  plano: <CreditCard className="h-4 w-4" />,
  dados: <Shield className="h-4 w-4" />,
};

function ProfileTab() {
  const { user, profile, loading } = useUser();
  const [isEditing, setIsEditing] = useState(false);
  const [displayName, setDisplayName] = useState('');
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  useEffect(() => {
    if (profile?.display_name) setDisplayName(profile.display_name);
  }, [profile?.display_name]);

  async function handleSave() {
    setSaving(true);
    setSaveError(null);
    try {
      const supabase = createClient();
      const { error } = await supabase
        .from('profiles')
        .update({ display_name: displayName })
        .eq('id', user!.id);
      if (error) throw new Error(error.message);
      setIsEditing(false);
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Erro ao salvar');
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <div>
          <label className="mb-1 block text-sm font-medium text-muted-foreground">E-mail</label>
          <Skeleton className="h-4 w-48" />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-muted-foreground">Nome</label>
          <Skeleton className="h-4 w-32" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-border bg-card p-4 lg:p-5">
        <div className="mb-4 flex items-center justify-between">
          <p className="text-sm font-semibold text-foreground">Informações do perfil</p>
          {!isEditing && (
            <Button variant="outline" size="sm" onClick={() => setIsEditing(true)}>
              Editar
            </Button>
          )}
        </div>
        <div className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-muted-foreground">E-mail</label>
            <p className="text-sm text-foreground">{user?.email ?? '—'}</p>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-muted-foreground">Nome</label>
            {isEditing ? (
              <input
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                className="h-9 w-full rounded-lg border border-input bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                placeholder="Seu nome"
                disabled={saving}
              />
            ) : (
              <p className="text-sm text-foreground">{profile?.display_name ?? '—'}</p>
            )}
          </div>
          {isEditing && (
            <>
              {saveError && (
                <p className="text-sm text-destructive">{saveError}</p>
              )}
              <div className="flex gap-2">
                <Button size="sm" disabled={saving} onClick={handleSave}>
                  {saving ? 'Salvando...' : 'Salvar'}
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={saving}
                  onClick={() => { setIsEditing(false); setSaveError(null); }}
                >
                  Cancelar
                </Button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function PlanTab() {
  const { isPro, isBasic, inTrial, trialDaysLeft } = usePlan();
  const { profile, user } = useUser();
  const [cancelConfirm, setCancelConfirm] = useState(false);
  const [showManageOptions, setShowManageOptions] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [currentPeriodEnd, setCurrentPeriodEnd] = useState<string | null>(null);

  useEffect(() => {
    if (!user || !isPro || inTrial) return;
    const supabase = createClient();
    supabase
      .from('subscriptions')
      .select('current_period_end')
      .eq('user_id', user.id)
      .eq('status', 'active')
      .order('updated_at', { ascending: false })
      .limit(1)
      .maybeSingle()
      .then(({ data }) => {
        if (data?.current_period_end) setCurrentPeriodEnd(data.current_period_end as string);
      });
  }, [user, isPro, inTrial]);

  async function handleUpgrade(planKey: 'basic_monthly' | 'pro_monthly', withTrial = false) {
    setActionLoading(true);
    setActionError(null);
    try {
      const res = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ planKey, withTrial }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Erro ao iniciar checkout');
      if (data.checkoutUrl) {
        window.location.href = data.checkoutUrl;
      }
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Erro desconhecido');
    } finally {
      setActionLoading(false);
    }
  }

  async function handleEndTrial() {
    setActionLoading(true);
    setActionError(null);
    try {
      const res = await fetch('/api/checkout/end-trial', { method: 'POST' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Erro');
      if (data.action === 'checkout' && data.checkoutUrl) {
        window.location.href = data.checkoutUrl;
      } else {
        window.location.reload();
      }
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Erro ao ativar plano');
    } finally {
      setActionLoading(false);
    }
  }

  async function handleDowngrade(planKey: 'basic_monthly') {
    setActionLoading(true);
    setActionError(null);
    try {
      const res = await fetch('/api/checkout/downgrade', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ planKey }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Erro ao fazer downgrade');
      if (data.action === 'checkout' && data.checkoutUrl) {
        window.location.href = data.checkoutUrl;
      } else {
        window.location.reload();
      }
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Erro ao fazer downgrade');
    } finally {
      setActionLoading(false);
    }
  }

  async function handleCancelSubscription() {
    setActionLoading(true);
    setActionError(null);
    try {
      const supabase = createClient();
      const { data: sub, error } = await supabase
        .from('subscriptions')
        .select('stripe_subscription_id')
        .eq('user_id', user!.id)
        .in('status', ['active', 'past_due'])
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) throw new Error(error.message);
      if (!sub?.stripe_subscription_id) throw new Error('Assinatura não encontrada');

      const res = await fetch(`/api/checkout/cancel`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subscriptionId: sub.stripe_subscription_id }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Erro ao cancelar');

      setCancelConfirm(false);
      window.location.reload();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Erro ao cancelar assinatura');
    } finally {
      setActionLoading(false);
    }
  }

  return (
    <div className="space-y-4">
      {/* Dois cards de plano com ações integradas */}
      <div className="grid gap-4 lg:grid-cols-2">

        {/* Card Basic */}
        <div className={cn(
          'flex flex-col rounded-xl border p-5',
          isBasic && !inTrial
            ? 'border-primary/40 ring-1 ring-primary/20 bg-primary/5'
            : 'border-border bg-card',
        )}>
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Basic</p>
              <div className="mt-1 flex items-baseline gap-0.5">
                <span className="text-2xl font-bold text-foreground">R$19,90</span>
                <span className="text-sm text-muted-foreground">/mês</span>
              </div>
            </div>
            {isBasic && !inTrial && (
              <span className="rounded-full bg-primary/10 px-2.5 py-1 text-xs font-semibold text-primary">
                Plano atual
              </span>
            )}
          </div>

          <ul className="mt-4 flex-1 space-y-2 text-sm">
            {['3 contas bancárias', 'Histórico do mês atual', 'Categorização IA', 'Dashboard completo', 'Chat IA (50 msgs/mês)'].map((f) => (
              <li key={f} className="flex items-center gap-2 text-muted-foreground">
                <span className="text-emerald-500 text-xs">✓</span>{f}
              </li>
            ))}
            <li className="flex items-center gap-2 text-muted-foreground/40 line-through">
              <span className="text-xs">✗</span>Histórico ilimitado
            </li>
          </ul>

          {/* Downgrade action — só aparece se estiver no Pro */}
          {isPro && (
            <div className="mt-5 border-t border-border pt-4">
              <Button
                variant="outline"
                size="sm"
                className="w-full"
                disabled={actionLoading}
                onClick={() => void handleDowngrade('basic_monthly')}
              >
                {actionLoading ? 'Aguarde...' : 'Migrar para Basic'}
              </Button>
            </div>
          )}
        </div>

        {/* Card Pro */}
        <div className={cn(
          'flex flex-col rounded-xl border p-5',
          isPro
            ? 'border-primary/40 ring-1 ring-primary/20 bg-primary/5'
            : 'border-border bg-card',
        )}>
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Pro</p>
              <div className="mt-1 flex items-baseline gap-0.5">
                <span className="text-2xl font-bold text-foreground">R$49,90</span>
                <span className="text-sm text-muted-foreground">/mês</span>
              </div>
            </div>
            {isPro && (
              <span className={cn(
                'rounded-full px-2.5 py-1 text-xs font-semibold',
                inTrial
                  ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300'
                  : 'bg-primary/10 text-primary',
              )}>
                {inTrial ? `Trial · ${trialDaysLeft}d` : 'Plano atual'}
              </span>
            )}
          </div>

          {inTrial && profile?.trial_ends_at && (
            <p className="mt-1.5 text-xs text-amber-600 dark:text-amber-400">
              Expira em {new Date(profile.trial_ends_at).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long' })}
            </p>
          )}
          {isPro && !inTrial && currentPeriodEnd && (
            <p className="mt-1.5 text-xs text-muted-foreground">
              Renova em {new Date(currentPeriodEnd + 'T12:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })}
            </p>
          )}

          <ul className="mt-4 flex-1 space-y-2 text-sm">
            {['Contas ilimitadas', 'Histórico ilimitado', 'Categorização IA', 'Dashboard + Comparativos', 'Chat IA (200 msgs/mês)', 'Entrada por áudio'].map((f) => (
              <li key={f} className="flex items-center gap-2 text-muted-foreground">
                <span className="text-emerald-500 text-xs">✓</span>{f}
              </li>
            ))}
          </ul>

          <div className="mt-5 border-t border-border pt-4 space-y-2">
            {/* Basic → upgrade para Pro */}
            {isBasic && !inTrial && (
              <>
                <Button className="w-full" disabled={actionLoading} onClick={() => handleUpgrade('pro_monthly', true)}>
                  {actionLoading ? 'Aguarde...' : 'Testar Pro 7 dias grátis'}
                </Button>
                <Button variant="outline" className="w-full" disabled={actionLoading} onClick={() => handleUpgrade('pro_monthly', false)}>
                  {actionLoading ? 'Aguarde...' : 'Assinar Pro — R$49,90/mês'}
                </Button>
              </>
            )}

            {/* Trial → toggle gerenciar */}
            {inTrial && (
              <>
                {!showManageOptions ? (
                  <button
                    type="button"
                    onClick={() => setShowManageOptions(true)}
                    className="w-full rounded-lg border border-border py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                  >
                    Gerenciar período de teste
                  </button>
                ) : (
                  <div className="space-y-2">
                    <Button
                      size="sm"
                      variant="outline"
                      className="w-full"
                      disabled={actionLoading}
                      onClick={() => void handleEndTrial()}
                    >
                      {actionLoading ? 'Aguarde...' : 'Converter para assinatura — R$49,90/mês'}
                    </Button>
                    {!cancelConfirm ? (
                      <button
                        type="button"
                        disabled={actionLoading}
                        onClick={() => setCancelConfirm(true)}
                        className="w-full py-1.5 text-center text-sm text-muted-foreground transition-colors hover:text-destructive disabled:opacity-50"
                      >
                        Cancelar período de teste
                      </button>
                    ) : (
                      <div className="rounded-lg border border-destructive/20 bg-destructive/5 p-3 space-y-2">
                        <p className="text-xs text-muted-foreground">
                          O trial será cancelado e você perderá o acesso Pro.
                        </p>
                        <div className="flex gap-2">
                          <Button variant="destructive" size="sm" className="flex-1" disabled={actionLoading} onClick={handleCancelSubscription}>
                            {actionLoading ? 'Cancelando...' : 'Confirmar'}
                          </Button>
                          <Button variant="outline" size="sm" className="flex-1" disabled={actionLoading} onClick={() => { setCancelConfirm(false); setShowManageOptions(false); }}>
                            Fechar
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </>
            )}

            {/* Pro ativo → cancelar */}
            {isPro && !inTrial && (
              <>
                {!cancelConfirm ? (
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full text-destructive hover:bg-destructive/5 hover:text-destructive"
                    disabled={actionLoading}
                    onClick={() => setCancelConfirm(true)}
                  >
                    Cancelar assinatura
                  </Button>
                ) : (
                  <div className="rounded-lg border border-destructive/20 bg-destructive/5 p-3 space-y-2">
                    <p className="text-xs text-muted-foreground">
                      Seu acesso Pro continua até o fim do período já pago.
                    </p>
                    <div className="flex gap-2">
                      <Button variant="destructive" size="sm" className="flex-1" disabled={actionLoading} onClick={handleCancelSubscription}>
                        {actionLoading ? 'Cancelando...' : 'Confirmar'}
                      </Button>
                      <Button variant="outline" size="sm" className="flex-1" disabled={actionLoading} onClick={() => setCancelConfirm(false)}>
                        Manter
                      </Button>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      {actionError && (
        <p className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {actionError}
        </p>
      )}
    </div>
  );
}

interface Report {
  id: string;
  month: string;
  status: string;
  pdfUrl: string | null;
}

const STATUS_LABELS: Record<string, string> = {
  pending: 'Aguardando',
  generating: 'Gerando…',
  completed: 'Pronto',
  failed: 'Falhou',
};

function DadosTab() {
  const router = useRouter();
  const { user } = useUser();
  const [emailOptIn, setEmailOptIn] = useState(false);
  const [emailOptInLoading, setEmailOptInLoading] = useState(false);
  const [reports, setReports] = useState<Report[]>([]);
  const [reportsLoading, setReportsLoading] = useState(true);
  const [downloadingMonth, setDownloadingMonth] = useState<string | null>(null);
  const [exportLoading, setExportLoading] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [deleteInput, setDeleteInput] = useState('');
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    void (async () => {
      try {
        const supabase = createClient();
        const { data: profile } = await supabase
          .from('profiles')
          .select('monthly_report_email')
          .eq('id', user.id)
          .single();
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        setEmailOptIn((profile as any)?.monthly_report_email ?? false);
      } catch {
        // silently ignore — field may not be in types yet
      }
    })();
  }, [user]);

  useEffect(() => {
    void (async () => {
      setReportsLoading(true);
      try {
        const res = await fetch('/api/reports/monthly');
        if (res.ok) {
          const json = await res.json();
          setReports(json.data ?? []);
        }
      } finally {
        setReportsLoading(false);
      }
    })();
  }, []);

  async function handleEmailOptInChange(checked: boolean) {
    setEmailOptInLoading(true);
    try {
      const res = await fetch('/api/user/preferences', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ monthly_report_email: checked }),
      });
      if (res.ok) setEmailOptIn(checked);
    } finally {
      setEmailOptInLoading(false);
    }
  }

  async function handleDownload(month: string) {
    setDownloadingMonth(month);
    try {
      const res = await fetch(`/api/reports/monthly/${month}/download`);
      if (!res.ok) return;
      const { url } = await res.json();
      window.open(url, '_blank');
    } finally {
      setDownloadingMonth(null);
    }
  }

  async function handleExport() {
    setExportLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/user/export');
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? 'Erro ao exportar dados');
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const disposition = res.headers.get('Content-Disposition') ?? '';
      const match = disposition.match(/filename="([^"]+)"/);
      a.download = match?.[1] ?? 'meus-dados-finansim.json';
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro desconhecido');
    } finally {
      setExportLoading(false);
    }
  }

  async function handleDeleteAccount() {
    setDeleteLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/user/account', { method: 'DELETE' });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? 'Erro ao excluir conta');
      }
      const supabase = createClient();
      await supabase.auth.signOut();
      router.push('/login?deleted=true');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao excluir conta');
      setDeleteLoading(false);
    }
  }

  return (
    <div className="space-y-4">
      {/* Notificações por email */}
      <div className="rounded-xl border border-border bg-card p-4">
        <p className="text-sm font-semibold text-foreground">Relatório mensal por email</p>
        <p className="mt-1 text-sm text-muted-foreground">
          Receba um resumo do seu mês financeiro em PDF no início de cada mês.
        </p>
        <label className="mt-3 flex cursor-pointer items-center gap-3">
          <input
            type="checkbox"
            checked={emailOptIn}
            disabled={emailOptInLoading}
            onChange={(e) => void handleEmailOptInChange(e.target.checked)}
            className="h-4 w-4 cursor-pointer accent-primary"
          />
          <span className="text-sm text-foreground">
            Quero receber meu resumo financeiro mensal por email
          </span>
        </label>
      </div>

      {/* Lista de relatórios gerados */}
      <div className="rounded-xl border border-border bg-card p-4">
        <p className="text-sm font-semibold text-foreground">Relatórios Mensais</p>
        {reportsLoading ? (
          <div className="mt-3 space-y-2">
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-8 w-full" />
          </div>
        ) : reports.length === 0 ? (
          <p className="mt-2 text-sm text-muted-foreground">
            Seu primeiro relatório será gerado no dia 1 do próximo mês.
          </p>
        ) : (
          <ul className="mt-3 space-y-2">
            {reports.map((r) => (
              <li key={r.id} className="flex items-center justify-between text-sm">
                <span className="text-foreground">{r.month}</span>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">{STATUS_LABELS[r.status] ?? r.status}</span>
                  {r.status === 'completed' && (
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={downloadingMonth === r.month}
                      onClick={() => void handleDownload(r.month)}
                    >
                      {downloadingMonth === r.month ? 'Aguarde…' : 'Baixar PDF'}
                    </Button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="rounded-xl border border-border bg-card p-4">
        <p className="text-sm font-semibold text-foreground">Exportar meus dados</p>
        <p className="mt-1 text-sm text-muted-foreground">
          Baixe todos os seus dados em formato JSON (LGPD art. 18, III — portabilidade).
        </p>
        <Button
          variant="outline"
          className="mt-3 w-full"
          disabled={exportLoading}
          onClick={handleExport}
        >
          {exportLoading ? 'Exportando...' : 'Baixar dados (JSON)'}
        </Button>
      </div>

      <div className="rounded-xl border border-border bg-card p-4">
        <p className="text-sm font-semibold text-foreground">Documentos legais</p>
        <ul className="mt-2 space-y-2">
          <li>
            <Link href="/privacy" className="text-sm text-primary hover:underline">
              Política de Privacidade
            </Link>
          </li>
          <li>
            <Link href="/terms" className="text-sm text-primary hover:underline">
              Termos de Uso
            </Link>
          </li>
        </ul>
      </div>

      <div className="rounded-xl border border-destructive/30 bg-card p-4">
        <p className="text-sm font-semibold text-foreground">Excluir conta</p>
        <p className="mt-1 text-sm text-muted-foreground">
          Todos os seus dados serão removidos permanentemente e imediatamente. Esta ação não pode
          ser desfeita (LGPD art. 18, VI — eliminação).
        </p>
        {!deleteConfirm ? (
          <Button
            variant="outline"
            className="mt-3 w-full text-destructive hover:bg-destructive/5 hover:text-destructive"
            disabled={deleteLoading}
            onClick={() => setDeleteConfirm(true)}
          >
            Excluir minha conta
          </Button>
        ) : (
          <div className="mt-3 space-y-3">
            <p className="text-sm text-muted-foreground">
              Esta ação é <strong className="text-destructive">irreversível</strong>. Todas as suas
              transações, orçamentos, objetivos e histórico serão removidos permanentemente.
            </p>
            <div className="flex flex-col gap-1.5">
              <label htmlFor="delete-confirm" className="text-sm font-medium text-foreground">
                Digite <strong>EXCLUIR</strong> para confirmar:
              </label>
              <input
                id="delete-confirm"
                type="text"
                value={deleteInput}
                onChange={(e) => setDeleteInput(e.target.value)}
                placeholder="EXCLUIR"
                className="h-9 w-full rounded-lg border border-destructive/50 bg-background px-3 text-sm text-foreground placeholder:text-muted-foreground focus:border-destructive focus:outline-none focus:ring-2 focus:ring-destructive/50 disabled:opacity-50"
                disabled={deleteLoading}
              />
            </div>
            <div className="flex gap-2">
              <Button
                variant="destructive"
                className="flex-1"
                disabled={deleteLoading || deleteInput !== 'EXCLUIR'}
                onClick={handleDeleteAccount}
              >
                {deleteLoading ? 'Excluindo...' : 'Confirmar exclusão'}
              </Button>
              <Button
                variant="outline"
                className="flex-1"
                disabled={deleteLoading}
                onClick={() => {
                  setDeleteConfirm(false);
                  setDeleteInput('');
                }}
              >
                Cancelar
              </Button>
            </div>
          </div>
        )}
      </div>

      {error && (
        <p className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>
      )}
    </div>
  );
}

export default function SettingsPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const initialTab = (searchParams.get('tab') as Tab) ?? 'perfil';
  const [activeTab, setActiveTab] = useState<Tab>(TABS.includes(initialTab) ? initialTab : 'perfil');

  function handleTabChange(tab: Tab) {
    setActiveTab(tab);
    router.replace(`/settings?tab=${tab}`, { scroll: false });
  }

  const tabLabels: Record<Tab, string> = { perfil: 'Perfil', plano: 'Plano', dados: 'Dados' };

  return (
    <div className="h-full overflow-y-auto">
      <div className="w-full px-4 py-6 pb-24 lg:px-8 lg:py-8 lg:pb-28">
        {/* Desktop hero */}
        <div className="hidden lg:block mb-8">
          <h1 className="text-3xl font-bold text-foreground">Configurações</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Gerencie seu perfil, plano e dados da conta
          </p>
        </div>

        {/* Mobile title */}
        <h1 className="mb-6 text-2xl font-bold text-foreground lg:hidden">Configurações</h1>

        {/* Desktop: dois painéis | Mobile: tabs */}
        <div className="lg:flex lg:gap-8">
          {/* Nav lateral desktop / tabs mobile */}
          <nav className="mb-6 lg:mb-0 lg:w-56 lg:shrink-0">
            {/* Mobile tabs */}
            <div className="flex rounded-xl border border-border bg-muted/30 p-1 lg:hidden">
              {TABS.map((tab) => (
                <button
                  key={tab}
                  onClick={() => handleTabChange(tab)}
                  className={cn(
                    'min-h-[44px] flex-1 rounded-lg py-2 text-sm font-medium transition-colors',
                    activeTab === tab
                      ? 'bg-background text-foreground shadow-sm'
                      : 'text-muted-foreground hover:text-foreground',
                  )}
                >
                  {tabLabels[tab]}
                </button>
              ))}
            </div>
            {/* Desktop nav */}
            <div className="hidden lg:flex lg:flex-col lg:gap-1">
              {TABS.map((tab) => (
                <button
                  key={tab}
                  onClick={() => handleTabChange(tab)}
                  className={cn(
                    'flex w-full items-center gap-3 rounded-xl px-4 py-2.5 text-sm font-medium transition-colors text-left',
                    activeTab === tab
                      ? 'bg-primary/10 text-primary'
                      : 'text-muted-foreground hover:bg-muted hover:text-foreground',
                  )}
                >
                  {TAB_ICONS[tab]}
                  {tabLabels[tab]}
                </button>
              ))}
            </div>
          </nav>

          {/* Content */}
          <div className="flex-1 min-w-0">
            {activeTab === 'perfil' && <ProfileTab />}
            {activeTab === 'plano' && <PlanTab />}
            {activeTab === 'dados' && <DadosTab />}
          </div>
        </div>
      </div>
    </div>
  );
}
