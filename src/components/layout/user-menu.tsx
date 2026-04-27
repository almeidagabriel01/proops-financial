'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { LogOut, Settings, ChevronDown } from 'lucide-react';
import * as Sentry from '@sentry/nextjs';
import { createClient } from '@/lib/supabase/client';
import { cn } from '@/lib/utils';

interface UserMenuProps {
  userName?: string | null;
  userEmail?: string;
  userPlan?: string | null;
  userTrialEndsAt?: string | null;
}

function getPlanLabel(plan?: string | null, trialEndsAt?: string | null): { label: string; variant: 'pro' | 'trial' | 'basic' | 'free' } {
  if (plan === 'pro') return { label: 'Pro', variant: 'pro' };
  if (trialEndsAt && new Date(trialEndsAt) > new Date()) return { label: 'Trial Pro', variant: 'trial' };
  if (plan === 'basic') return { label: 'Basic', variant: 'basic' };
  return { label: 'Grátis', variant: 'free' };
}

export function UserMenu({ userName, userEmail, userPlan, userTrialEndsAt }: UserMenuProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const router = useRouter();

  const initial = (userName ?? userEmail ?? 'U').charAt(0).toUpperCase();
  const displayName = userName ?? userEmail ?? '';
  const { label: planLabel, variant: planVariant } = getPlanLabel(userPlan, userTrialEndsAt);

  useEffect(() => {
    if (!open) return;
    function handleOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleOutside);
    return () => document.removeEventListener('mousedown', handleOutside);
  }, [open]);

  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    Sentry.setUser(null);
    router.push('/login');
    router.refresh();
  }

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        aria-label="Menu do usuário"
        aria-expanded={open}
        className={cn(
          'flex items-center gap-2.5 rounded-xl px-2.5 py-1.5',
          'transition-colors hover:bg-muted/60',
          open && 'bg-muted/60',
        )}
      >
        {/* Avatar */}
        <div
          className={cn(
            'flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-semibold',
            'bg-primary/15 text-primary',
          )}
        >
          {initial}
        </div>

        {/* Name + plan */}
        <div className="flex flex-col items-start leading-none">
          <span className="max-w-[120px] truncate text-sm font-medium text-foreground">
            {displayName || 'Usuário'}
          </span>
          <span
            className={cn(
              'mt-0.5 text-[10px] font-semibold',
              planVariant === 'pro' && 'text-primary',
              planVariant === 'trial' && 'text-amber-500 dark:text-amber-400',
              (planVariant === 'basic' || planVariant === 'free') && 'text-muted-foreground',
            )}
          >
            {planLabel}
          </span>
        </div>

        <ChevronDown
          className={cn(
            'h-3.5 w-3.5 text-muted-foreground transition-transform duration-150',
            open && 'rotate-180',
          )}
        />
      </button>

      {open && (
        <div className="absolute right-0 top-12 z-50 w-56 overflow-hidden rounded-xl border border-border bg-card shadow-lg">
          {/* User info */}
          <div className="border-b border-border px-3 py-2.5">
            {userName && (
              <p className="truncate text-sm font-medium text-foreground">{userName}</p>
            )}
            {userEmail && (
              <p className="truncate text-xs text-muted-foreground">{userEmail}</p>
            )}
            <span
              className={cn(
                'mt-1 inline-block rounded-full px-2 py-0.5 text-[10px] font-semibold',
                planVariant === 'pro' && 'bg-primary/10 text-primary',
                planVariant === 'trial' && 'bg-amber-500/10 text-amber-600 dark:text-amber-400',
                (planVariant === 'basic' || planVariant === 'free') && 'bg-muted text-muted-foreground',
              )}
            >
              {planLabel}
            </span>
          </div>

          {/* Settings */}
          <Link
            href="/settings"
            onClick={() => setOpen(false)}
            className="flex items-center gap-2.5 px-3 py-2.5 text-sm text-foreground transition-colors hover:bg-muted/60"
          >
            <Settings className="h-4 w-4 text-muted-foreground" />
            Configurações
          </Link>

          {/* Logout */}
          <button
            onClick={handleLogout}
            className="flex w-full items-center gap-2.5 border-t border-border px-3 py-2.5 text-sm text-destructive transition-colors hover:bg-muted/60"
          >
            <LogOut className="h-4 w-4" />
            Sair
          </button>
        </div>
      )}
    </div>
  );
}
