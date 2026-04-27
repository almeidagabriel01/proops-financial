import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { AppShell } from '@/components/layout/app-shell';
import { isWithinGracePeriod } from '@/lib/billing/webhook-handler';

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('onboarding_completed, display_name, plan, trial_ends_at, subscription_status')
    .eq('id', user.id)
    .single();

  // Paywall check — must run before onboarding to avoid redirect loops
  // subscription_status é a fonte primária; trial_ends_at é fallback para legado
  const subStatus = profile?.subscription_status;
  const hasDirectAccess =
    subStatus === 'active' ||
    subStatus === 'trialing' ||
    (profile?.trial_ends_at != null && new Date(profile.trial_ends_at) > new Date());

  if (!hasDirectAccess) {
    // Sem acesso direto: verificar past_due com grace period na tabela subscriptions
    const { data: sub } = await supabase
      .from('subscriptions')
      .select('status, updated_at')
      .eq('user_id', user.id)
      .in('status', ['active', 'trialing', 'past_due'])
      .order('updated_at', { ascending: false })
      .limit(1)
      .single();

    const hasAccess = sub && (
      sub.status === 'active' ||
      sub.status === 'trialing' ||
      (sub.status === 'past_due' && isWithinGracePeriod(sub.updated_at as string))
    );

    if (!hasAccess) {
      redirect('/paywall');
    }
  }

  const { count: transactionCount } = await supabase
    .from('transactions')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', user.id);

  const onboardingCompleted = profile?.onboarding_completed ?? false;
  const hasTransactions = (transactionCount ?? 0) > 0;

  // New user with no data → force onboarding
  if (!onboardingCompleted && !hasTransactions) {
    redirect('/onboarding');
  }

  // Existing user with data but onboarding never completed → show banner (no forced redirect)
  const showOnboardingBanner = !onboardingCompleted && hasTransactions;

  return (
    <AppShell
      showOnboardingBanner={showOnboardingBanner}
      userName={profile?.display_name ?? null}
      userEmail={user.email ?? ''}
      userPlan={profile?.plan ?? 'free'}
      userTrialEndsAt={profile?.trial_ends_at ?? null}
      userSubscriptionStatus={profile?.subscription_status ?? null}
    >
      {children}
    </AppShell>
  );
}
