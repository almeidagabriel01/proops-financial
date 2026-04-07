import { redirect } from 'next/navigation';
import { Toaster } from 'sonner';
import { createClient } from '@/lib/supabase/server';
import { LogoutButton } from '@/components/logout-button';
import { BottomNav } from '@/components/layout/bottom-nav';
import { TrialBanner } from '@/components/layout/trial-banner';

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  return (
    <div className="flex min-h-dvh flex-col">
      <TrialBanner />
      <header className="border-b border-border bg-card px-4 py-3">
        <div className="mx-auto flex max-w-screen-lg items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-sm font-bold text-primary-foreground">
              F
            </div>
            <span className="font-semibold text-foreground">Finansim</span>
          </div>
          <LogoutButton />
        </div>
      </header>
      {/* pb-16 compensates bottom-nav height (AC8) */}
      <main className="flex-1 pb-16">{children}</main>
      <BottomNav />
      <Toaster position="bottom-center" richColors />
    </div>
  );
}
