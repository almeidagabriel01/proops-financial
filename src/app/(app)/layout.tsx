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

  // Exclude subscription_status from SELECT: column added by migration 027, which may
  // not be applied yet — selecting it causes PGRST204 and returns profile=null.
  const { data: profile } = await supabase
    .from('profiles')
    .select('onboarding_completed, display_name, plan, trial_ends_at')
    .eq('id', user.id)
    .single();

  // Always query subscriptions: authoritative billing state, always populated by webhooks/sync.
  const { data: activeSub } = await supabase
    .from('subscriptions')
    .select('status, updated_at')
    .eq('user_id', user.id)
    .in('status', ['active', 'trialing', 'past_due'])
    .order('updated_at', { ascending: false })
    .limit(1)
    .single();

  // Paywall check — source of truth is the subscriptions table (Stripe-backed).
  // profile.plan === 'pro' is a valid fallback: only set by DB trigger on real subscriptions.
  // trial_ends_at is intentionally excluded: handle_new_user may still populate it even
  // for users who never paid, making it an unreliable gate.
  const hasDirectAccess =
    activeSub?.status === 'active' ||
    activeSub?.status === 'trialing' ||
    profile?.plan === 'pro';

  const hasPastDueAccess =
    activeSub?.status === 'past_due' && isWithinGracePeriod(activeSub.updated_at as string);

  if (!hasDirectAccess && !hasPastDueAccess) {
    // Had a trial that expired → paywall to upgrade; no paid plan → landing page
    const hadExpiredTrial =
      profile?.trial_ends_at != null && new Date(profile.trial_ends_at) <= new Date();
    redirect(hadExpiredTrial ? '/paywall' : '/');
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
      userSubscriptionStatus={activeSub?.status ?? null}
    >
      {children}
    </AppShell>
  );
}
