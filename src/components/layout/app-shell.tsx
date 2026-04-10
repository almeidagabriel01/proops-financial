'use client';

import { Toaster } from 'sonner';
import { LogoutButton } from '@/components/logout-button';
import { BottomNav } from '@/components/layout/bottom-nav';
import { TrialBanner } from '@/components/layout/trial-banner';
import { OnboardingBanner } from '@/components/layout/onboarding-banner';
import { OfflineBanner } from '@/components/layout/offline-banner';
import { PWAInstallBanner } from '@/components/layout/pwa-install-banner';
import { ThemeToggle } from '@/components/layout/theme-toggle';
import { FloatingChatButton } from '@/components/layout/floating-chat-button';
import { Dock } from '@/components/layout/dock';
import { UserMenu } from '@/components/layout/user-menu';
import { CookieConsent } from '@/components/layout/cookie-consent';

interface AppShellProps {
  children: React.ReactNode;
  showOnboardingBanner: boolean;
  userName?: string | null;
  userEmail?: string;
  userPlan?: string | null;
  userTrialEndsAt?: string | null;
}

export function AppShell({ children, showOnboardingBanner, userName, userEmail, userPlan, userTrialEndsAt }: AppShellProps) {
  return (
    <div className="flex h-dvh flex-col overflow-hidden">
      {/* Header mobile */}
      <header className="lg:hidden shrink-0 border-b border-border bg-card px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-sm font-bold text-primary-foreground">
              F
            </div>
            <span className="font-semibold text-foreground">Finansim</span>
          </div>
          <div className="flex items-center gap-1">
            <ThemeToggle />
            <LogoutButton />
          </div>
        </div>
      </header>

      {/* Desktop topbar */}
      <header className="hidden lg:flex shrink-0 h-14 items-center justify-between border-b border-border bg-card px-6">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-sm font-bold text-primary-foreground">
            F
          </div>
          <span className="font-semibold text-foreground">Finansim</span>
        </div>
        <div className="flex items-center gap-3">
          <ThemeToggle />
          <UserMenu
            userName={userName}
            userEmail={userEmail}
            userPlan={userPlan}
            userTrialEndsAt={userTrialEndsAt}
          />
        </div>
      </header>

      {/* Banners */}
      <OfflineBanner />
      <PWAInstallBanner />
      <TrialBanner />
      <OnboardingBanner show={showOnboardingBanner} />

      {/* Main — dock/FAB são fixed e sobrepõem o conteúdo */}
      <main className="flex flex-1 flex-col overflow-hidden">
        {children}
      </main>

      {/* BottomNav: apenas mobile */}
      <BottomNav className="lg:hidden" />

      {/* Dock: apenas desktop */}
      <div className="hidden lg:block">
        <Dock />
      </div>

      {/* Chat FAB */}
      <FloatingChatButton />

      {/* Cookie consent banner (LGPD) */}
      <CookieConsent />

      <Toaster position="bottom-center" richColors />
    </div>
  );
}
