import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { AppShell } from '@/components/layout/app-shell';

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  // Onboarding check — runs for all (app) routes
  const { data: profile } = await supabase
    .from('profiles')
    .select('onboarding_completed, display_name, plan, trial_ends_at')
    .eq('id', user.id)
    .single();

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
    >
      {children}
    </AppShell>
  );
}
