'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Skeleton } from '@/components/ui/skeleton';
import * as Sentry from '@sentry/nextjs';
import { usePlan } from '@/hooks/use-plan';
import { useUser } from '@/hooks/use-user';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { useSearchParams, useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import {
  User, CreditCard, Shield, Check, X,
  Bell, Download, FileText, Trash2,
  ExternalLink, Pencil, Infinity as InfinityIcon,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const TABS = ['perfil', 'plano', 'dados'] as const;
type Tab = (typeof TABS)[number];

const TAB_META: Record<Tab, { label: string; icon: React.ReactNode }> = {
  perfil: { label: 'Perfil', icon: <User className="h-4 w-4" /> },
  plano:  { label: 'Plano',  icon: <CreditCard className="h-4 w-4" /> },
  dados:  { label: 'Dados',  icon: <Shield className="h-4 w-4" /> },
};

function SectionHeader({ icon, title, description }: { icon: React.ReactNode; title: string; description?: string }) {
  return (
    <div className="flex items-start gap-3 mb-4">
      <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
        {icon}
      </span>
      <div>
        <p className="text-sm font-semibold text-foreground">{title}</p>
        {description && <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>}
      </div>
    </div>
  );
}

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
        <div className="flex items-center gap-4 rounded-xl border border-border bg-card p-4">
          <Skeleton className="h-14 w-14 rounded-full" />
          <div className="space-y-2">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-3 w-48" />
          </div>
        </div>
        <Skeleton className="h-28 w-full rounded-xl" />
      </div>
    );
  }

  const name = profile?.display_name || '';
  const email = user?.email ?? '';
  const initials = (name || email).slice(0, 2).toUpperCase();

  return (
    <div className="space-y-4">
      {/* Avatar + identidade */}
      <div className="flex items-center gap-4 rounded-xl border border-border bg-card p-4">
        <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-primary/10">
          <span className="text-lg font-bold text-primary">{initials}</span>
        </div>
        <div className="min-w-0">
          <p className="truncate font-semibold text-foreground">{name || 'Sem nome'}</p>
          <p className="truncate text-sm text-muted-foreground">{email}</p>
        </div>
        {!isEditing && (
          <Button variant="ghost" size="icon" className="ml-auto shrink-0" onClick={() => setIsEditing(true)} aria-label="Editar perfil">
            <Pencil className="h-4 w-4" />
          </Button>
        )}
      </div>

      {/* Campos */}
      <div className="rounded-xl border border-border bg-card p-4 lg:p-5">
        <SectionHeader icon={<User className="h-4 w-4" />} title="Informações da conta" />

        <div className="space-y-4">
          <div>
            <label className="mb-1.5 block text-xs font-medium text-muted-foreground">E-mail</label>
            <Input value={email} disabled className="bg-muted/30 text-muted-foreground" />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Nome de exibição</label>
            {isEditing ? (
              <Input
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Seu nome"
                disabled={saving}
                autoFocus
              />
            ) : (
              <Input value={name || '—'} disabled className="bg-muted/30 text-muted-foreground" />
            )}
          </div>

          {isEditing && (
            <>
              {saveError && (
                <p className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">{saveError}</p>
              )}
              <div className="flex gap-2">
                <Button size="sm" disabled={saving} onClick={handleSave} className="flex-1">
                  {saving ? 'Salvando...' : 'Salvar'}
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={saving}
                  onClick={() => { setIsEditing(false); setSaveError(null); }}
                  className="flex-1"
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

function PlanFeature({ included, text }: { included: boolean; text: string }) {
  return (
    <li className="flex items-center gap-2.5">
      {included
        ? <Check className="h-4 w-4 shrink-0 text-green-500" />
        : <X className="h-4 w-4 shrink-0 text-muted-foreground/40" />
      }
      <span className={cn('text-sm', included ? 'text-foreground' : 'text-muted-foreground/60 line-through')}>{text}</span>
    </li>
  );
}

function PlanTab() {
  const { isPro, isBasic, inTrial, trialDaysLeft, aiMonthlyLimit, maxBankAccounts } = usePlan();
  const { profile, user } = useUser();
  const [cancelConfirm, setCancelConfirm] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [currentPeriodEnd, setCurrentPeriodEnd] = useState<string | null>(null);
  const [subLoading, setSubLoading] = useState(false);

  useEffect(() => {
    if (!user || !isPro || inTrial) return;
    setSubLoading(true);
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
        setSubLoading(false);
      });
  }, [user, isPro, inTrial]);

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
      if (data.checkoutUrl) window.open(data.checkoutUrl, '_blank', 'noopener,noreferrer');
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

      const res = await fetch('/api/checkout/cancel', {
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

  const basicFeatures = [
    { text: '3 contas bancárias', included: true },
    { text: 'Mês atual de histórico', included: true },
    { text: 'Categorização por IA', included: true },
    { text: 'Dashboard completo', included: true },
    { text: 'Chat IA (50 msgs/mês)', included: true },
    { text: 'Histórico ilimitado', included: false },
    { text: 'Entrada por áudio', included: false },
  ];

  const proFeatures = [
    { text: 'Contas ilimitadas', included: true },
    { text: 'Histórico ilimitado', included: true },
    { text: 'Categorização por IA', included: true },
    { text: 'Dashboard + Comparativos', included: true },
    { text: 'Chat IA (200 msgs/mês)', included: true },
    { text: 'Entrada por áudio', included: true },
  ];

  return (
    <div className="space-y-4">
      {/* Status do plano atual */}
      <div className={cn(
        'rounded-xl border p-4',
        isPro ? 'border-primary/30 bg-primary/5' : 'border-border bg-card',
      )}>
        <div className="flex items-center justify-between gap-2">
          <div>
            <p className="text-xs font-medium text-muted-foreground">Plano atual</p>
            <p className="mt-0.5 text-2xl font-bold text-foreground">{isPro ? 'Pro' : 'Basic'}</p>
            <p className="text-sm text-muted-foreground">{isPro ? 'R$49,90/mês' : 'R$19,90/mês'}</p>
          </div>
          <div className="flex flex-col items-end gap-2">
            {inTrial ? (
              <Badge variant="outline" className="border-amber-300 bg-amber-50 text-amber-700 dark:border-amber-700 dark:bg-amber-900/20 dark:text-amber-300">
                Trial — {trialDaysLeft}d restantes
              </Badge>
            ) : isPro ? (
              <Badge variant="outline" className="border-primary/30 bg-primary/10 text-primary">
                Ativo
              </Badge>
            ) : (
              <Badge variant="outline" className="text-muted-foreground">
                Ativo
              </Badge>
            )}
            <div className="flex items-center gap-3 text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                {maxBankAccounts === Infinity ? <InfinityIcon className="h-3.5 w-3.5" /> : maxBankAccounts} contas
              </span>
              <span>•</span>
              <span>{aiMonthlyLimit} msgs/mês</span>
            </div>
          </div>
        </div>

        {inTrial && profile?.trial_ends_at && (
          <p className="mt-3 text-xs text-muted-foreground">
            Trial expira em{' '}
            <span className="font-medium text-foreground">
              {new Date(profile.trial_ends_at).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long' })}
            </span>
          </p>
        )}
      </div>

      {/* Comparação de planos */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {/* Basic */}
        <div className={cn(
          'rounded-xl border p-4',
          isBasic && !inTrial ? 'border-primary ring-2 ring-primary/20 bg-primary/5' : 'border-border bg-card',
        )}>
          <div className="mb-1 flex items-center justify-between">
            <p className="font-semibold text-foreground">Basic</p>
            {isBasic && !inTrial && (
              <Badge variant="outline" className="border-primary/30 bg-primary/10 text-primary text-[11px]">Atual</Badge>
            )}
          </div>
          <p className="mb-4 text-xl font-bold text-foreground">
            R$19,90<span className="text-sm font-normal text-muted-foreground">/mês</span>
          </p>
          <ul className="space-y-2">
            {basicFeatures.map((f) => <PlanFeature key={f.text} {...f} />)}
          </ul>
        </div>

        {/* Pro */}
        <div className={cn(
          'rounded-xl border p-4',
          isPro ? 'border-primary ring-2 ring-primary/20 bg-primary/5' : 'border-border bg-card',
        )}>
          <div className="mb-1 flex items-center justify-between">
            <p className="font-semibold text-foreground">Pro</p>
            {isPro && (
              <Badge variant="outline" className="border-primary/30 bg-primary/10 text-primary text-[11px]">
                {inTrial ? 'Trial' : 'Atual'}
              </Badge>
            )}
          </div>
          <p className="mb-4 text-xl font-bold text-foreground">
            R$49,90<span className="text-sm font-normal text-muted-foreground">/mês</span>
          </p>
          <ul className="space-y-2">
            {proFeatures.map((f) => <PlanFeature key={f.text} {...f} />)}
          </ul>
          {!isPro && (
            <Button className="mt-4 w-full" disabled={actionLoading} onClick={() => handleUpgrade('pro_monthly')}>
              {actionLoading ? 'Aguarde...' : 'Assinar Pro'}
            </Button>
          )}
        </div>
      </div>

      {/* CTA Trial */}
      {inTrial && (
        <div className="rounded-xl border border-primary/20 bg-primary/5 p-4">
          <p className="text-sm font-semibold text-foreground">Assinar antes do trial expirar</p>
          <p className="mt-1 text-sm text-muted-foreground">Mantenha acesso Pro sem interrupção.</p>
          <Button className="mt-3 w-full" disabled={actionLoading} onClick={() => handleUpgrade('pro_monthly')}>
            {actionLoading ? 'Aguarde...' : 'Assinar Pro — R$49,90/mês'}
          </Button>
        </div>
      )}

      {/* Gerenciar assinatura Pro */}
      {isPro && !inTrial && (
        <div className="rounded-xl border border-border bg-card p-4">
          <p className="mb-3 text-sm font-semibold text-foreground">Gerenciar assinatura</p>
          {subLoading ? (
            <Skeleton className="mb-3 h-4 w-56" />
          ) : currentPeriodEnd ? (
            <p className="mb-3 text-sm text-muted-foreground">
              Próximo vencimento:{' '}
              <span className="font-medium text-foreground">
                {new Date(currentPeriodEnd + 'T12:00:00').toLocaleDateString('pt-BR', {
                  day: '2-digit', month: 'long', year: 'numeric',
                })}
              </span>
            </p>
          ) : null}
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
                <Button variant="destructive" className="flex-1" disabled={actionLoading} onClick={handleCancelSubscription}>
                  {actionLoading ? 'Cancelando...' : 'Confirmar cancelamento'}
                </Button>
                <Button variant="outline" className="flex-1" disabled={actionLoading} onClick={() => setCancelConfirm(false)}>
                  Manter
                </Button>
              </div>
            </div>
          )}
        </div>
      )}

      {actionError && (
        <p className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">{actionError}</p>
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
      Sentry.setUser(null);
      await supabase.auth.signOut();
      router.push('/login?deleted=true');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao excluir conta');
      setDeleteLoading(false);
    }
  }

  return (
    <div className="space-y-4">
      {/* Notificações */}
      <div className="rounded-xl border border-border bg-card p-4 lg:p-5">
        <SectionHeader
          icon={<Bell className="h-4 w-4" />}
          title="Notificações por e-mail"
          description="Receba um resumo do seu mês financeiro em PDF no início de cada mês."
        />
        <div className="flex items-center justify-between gap-4">
          <label htmlFor="email-optin" className="cursor-pointer text-sm text-foreground">
            Relatório mensal em PDF
          </label>
          <Switch
            id="email-optin"
            checked={emailOptIn}
            disabled={emailOptInLoading}
            onCheckedChange={(v) => void handleEmailOptInChange(v)}
          />
        </div>
      </div>

      {/* Relatórios gerados */}
      <div className="rounded-xl border border-border bg-card p-4 lg:p-5">
        <SectionHeader
          icon={<FileText className="h-4 w-4" />}
          title="Relatórios Mensais"
          description="PDFs gerados automaticamente no dia 1 de cada mês."
        />
        {reportsLoading ? (
          <div className="space-y-2">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        ) : reports.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Seu primeiro relatório será gerado no dia 1 do próximo mês.
          </p>
        ) : (
          <ul className="divide-y divide-border">
            {reports.map((r) => (
              <li key={r.id} className="flex items-center justify-between gap-2 py-2.5 first:pt-0 last:pb-0">
                <span className="text-sm font-medium text-foreground">{r.month}</span>
                <div className="flex items-center gap-2">
                  <span className={cn(
                    'text-xs font-medium',
                    r.status === 'completed' ? 'text-green-600 dark:text-green-400' :
                    r.status === 'failed' ? 'text-destructive' : 'text-muted-foreground',
                  )}>
                    {STATUS_LABELS[r.status] ?? r.status}
                  </span>
                  {r.status === 'completed' && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-7 gap-1.5 text-xs"
                      disabled={downloadingMonth === r.month}
                      onClick={() => void handleDownload(r.month)}
                    >
                      <Download className="h-3 w-3" />
                      {downloadingMonth === r.month ? 'Aguarde…' : 'Baixar'}
                    </Button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Exportar dados */}
      <div className="rounded-xl border border-border bg-card p-4 lg:p-5">
        <SectionHeader
          icon={<Download className="h-4 w-4" />}
          title="Exportar meus dados"
          description="Baixe todos os seus dados em formato JSON — portabilidade LGPD (art. 18, III)."
        />
        <Button variant="outline" className="w-full gap-2" disabled={exportLoading} onClick={handleExport}>
          <Download className="h-4 w-4" />
          {exportLoading ? 'Exportando...' : 'Baixar dados (JSON)'}
        </Button>
      </div>

      {/* Documentos legais */}
      <div className="rounded-xl border border-border bg-card p-4 lg:p-5">
        <SectionHeader icon={<FileText className="h-4 w-4" />} title="Documentos legais" />
        <div className="divide-y divide-border">
          <Link
            href="/privacy"
            className="flex items-center justify-between py-2.5 first:pt-0 last:pb-0 text-sm text-foreground hover:text-primary transition-colors"
          >
            Política de Privacidade
            <ExternalLink className="h-3.5 w-3.5 text-muted-foreground" />
          </Link>
          <Link
            href="/terms"
            className="flex items-center justify-between py-2.5 first:pt-0 last:pb-0 text-sm text-foreground hover:text-primary transition-colors"
          >
            Termos de Uso
            <ExternalLink className="h-3.5 w-3.5 text-muted-foreground" />
          </Link>
        </div>
      </div>

      {/* Zona de perigo */}
      <div className="rounded-xl border border-destructive/30 bg-card p-4 lg:p-5">
        <SectionHeader
          icon={<Trash2 className="h-4 w-4 text-destructive" />}
          title="Excluir conta"
          description="Remove permanentemente todos os seus dados. Ação irreversível (LGPD art. 18, VI)."
        />
        {!deleteConfirm ? (
          <Button
            variant="outline"
            className="w-full text-destructive hover:bg-destructive/5 hover:text-destructive"
            disabled={deleteLoading}
            onClick={() => setDeleteConfirm(true)}
          >
            Excluir minha conta
          </Button>
        ) : (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Esta ação é <strong className="text-destructive">irreversível</strong>. Todas as suas
              transações, orçamentos, objetivos e histórico serão removidos permanentemente.
            </p>
            <div>
              <label htmlFor="delete-confirm" className="mb-1.5 block text-sm font-medium text-foreground">
                Digite <strong>EXCLUIR</strong> para confirmar:
              </label>
              <Input
                id="delete-confirm"
                value={deleteInput}
                onChange={(e) => setDeleteInput(e.target.value)}
                placeholder="EXCLUIR"
                disabled={deleteLoading}
                className="border-destructive/50 focus-visible:ring-destructive"
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
                onClick={() => { setDeleteConfirm(false); setDeleteInput(''); }}
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

  return (
    <div className="h-full overflow-y-auto">
      <div className="w-full px-4 py-6 pb-24 lg:px-8 lg:py-8 lg:pb-28">
        {/* Desktop hero */}
        <div className="mb-8 hidden lg:block">
          <h1 className="text-3xl font-bold text-foreground">Configurações</h1>
          <p className="mt-1 text-sm text-muted-foreground">Gerencie seu perfil, plano e dados da conta</p>
        </div>

        {/* Mobile title */}
        <h1 className="mb-5 text-xl font-bold text-foreground lg:hidden">Configurações</h1>

        <div className="lg:flex lg:gap-8">
          {/* Sidebar desktop / tabs mobile */}
          <nav className="mb-6 lg:mb-0 lg:w-52 lg:shrink-0">
            {/* Mobile: tabs com ícone + texto */}
            <div className="flex rounded-xl border border-border bg-muted/30 p-1 lg:hidden">
              {TABS.map((tab) => (
                <button
                  key={tab}
                  onClick={() => handleTabChange(tab)}
                  className={cn(
                    'min-h-[44px] flex-1 flex flex-col items-center justify-center gap-0.5 rounded-lg py-2 text-xs font-medium transition-colors',
                    activeTab === tab
                      ? 'bg-background text-foreground shadow-sm'
                      : 'text-muted-foreground hover:text-foreground',
                  )}
                >
                  {TAB_META[tab].icon}
                  {TAB_META[tab].label}
                </button>
              ))}
            </div>

            {/* Desktop: sidebar nav */}
            <div className="hidden lg:flex lg:flex-col lg:gap-0.5">
              {TABS.map((tab) => (
                <button
                  key={tab}
                  onClick={() => handleTabChange(tab)}
                  className={cn(
                    'flex w-full items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition-colors text-left',
                    activeTab === tab
                      ? 'bg-primary/10 text-primary'
                      : 'text-muted-foreground hover:bg-muted hover:text-foreground',
                  )}
                >
                  {TAB_META[tab].icon}
                  {TAB_META[tab].label}
                </button>
              ))}
            </div>
          </nav>

          {/* Conteúdo */}
          <div className="min-w-0 flex-1">
            {activeTab === 'perfil' && <ProfileTab />}
            {activeTab === 'plano' && <PlanTab />}
            {activeTab === 'dados' && <DadosTab />}
          </div>
        </div>
      </div>
    </div>
  );
}
