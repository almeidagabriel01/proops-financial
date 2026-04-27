'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  BarChart2,
  CreditCard,
  CalendarDays,
  Bot,
  Wallet,
  Target,
  Upload,
  LogOut,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { createClient } from '@/lib/supabase/client';
const items = [
  { href: '/dashboard', icon: BarChart2, label: 'Início' },
  { href: '/transactions', icon: CreditCard, label: 'Transações' },
  { href: '/financeiro', icon: CalendarDays, label: 'Financeiro' },
  { href: '/chat', icon: Bot, label: 'Chat IA' },
  { href: '/more/orcamentos', icon: Wallet, label: 'Orçamentos' },
  { href: '/more/objetivos', icon: Target, label: 'Objetivos' },
  { href: '/import', icon: Upload, label: 'Importar' },
] as const;

const HIDE_DELAY = 6_000;

export function Dock() {
  const [visible, setVisible] = useState(true);
  const [hovered, setHovered] = useState<number | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pathname = usePathname();
  const router = useRouter();

  const startTimer = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => setVisible(false), HIDE_DELAY);
  }, []);

  const cancelTimer = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
  }, []);

  const show = useCallback(() => {
    setVisible(true);
    startTimer();
  }, [startTimer]);

  useEffect(() => {
    startTimer();
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [startTimer]);

  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push('/login');
    router.refresh();
  }

  const logoutIdx = items.length + 1; // unique hover index

  return (
    <>
      {/* Invisible trigger zone — hover here to reveal dock */}
      <div
        className="fixed bottom-0 left-0 right-0 z-40 h-8"
        onMouseEnter={show}
      />

      {/* Dock container */}
      <div
        className={cn(
          'fixed bottom-5 left-1/2 z-50 -translate-x-1/2',
          'flex items-center gap-2 rounded-2xl px-3 py-2',
          'border border-white/20 bg-card/75 backdrop-blur-2xl',
          'shadow-[0_8px_40px_oklch(0_0_0/18%),0_0_0_1px_oklch(0_0_0/4%)]',
          'transition-all duration-300 ease-in-out',
          visible
            ? 'opacity-100 translate-y-0 pointer-events-auto'
            : 'opacity-0 translate-y-6 pointer-events-none',
        )}
        onMouseEnter={cancelTimer}
        onMouseLeave={startTimer}
      >
        {items.map((item, i) => {
          const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
          const Icon = item.icon;
          const isHovered = hovered === i;
          return (
            <div
              key={item.href}
              className="relative flex flex-col items-center isolate"
              style={{ zIndex: isHovered ? 10 : 1 }}
              onMouseEnter={() => setHovered(i)}
              onMouseLeave={() => setHovered(null)}
            >
              {/* Tooltip */}
              <div
                className={cn(
                  'pointer-events-none absolute -top-9 left-1/2 -translate-x-1/2',
                  'whitespace-nowrap rounded-lg border border-border/50 bg-popover',
                  'px-2.5 py-1 text-xs font-medium text-popover-foreground shadow-md',
                  'transition-all duration-150',
                  isHovered ? 'opacity-100' : 'opacity-0 translate-y-1',
                )}
              >
                {item.label}
              </div>

              <Link
                href={item.href}
                aria-current={isActive ? 'page' : undefined}
                aria-label={item.label}
                className={cn(
                  'flex h-11 w-11 items-center justify-center rounded-xl',
                  'transition-transform duration-150',
                  isHovered ? 'scale-110' : 'scale-100',
                  isActive
                    ? 'bg-primary/15 text-primary'
                    : 'text-muted-foreground hover:bg-muted/60 hover:text-foreground',
                )}
              >
                <Icon className="h-5 w-5" />
              </Link>

              {/* Active indicator dot */}
              <span
                className={cn(
                  'mt-0.5 h-1 w-1 rounded-full bg-primary transition-opacity duration-200',
                  isActive ? 'opacity-100' : 'opacity-0',
                )}
              />
            </div>
          );
        })}

        {/* Separator */}
        <div className="mx-1.5 h-8 w-px bg-border/60" />

        {/* Logout button */}
        <div
          className="relative flex flex-col items-center"
          onMouseEnter={() => setHovered(logoutIdx)}
          onMouseLeave={() => setHovered(null)}
        >
          <div
            className={cn(
              'pointer-events-none absolute -top-9 left-1/2 -translate-x-1/2',
              'whitespace-nowrap rounded-lg border border-border/50 bg-popover',
              'px-2.5 py-1 text-xs font-medium text-popover-foreground shadow-md',
              'transition-all duration-150',
              hovered === logoutIdx ? 'opacity-100' : 'opacity-0 translate-y-1',
            )}
          >
            Sair
          </div>
          <button
            onClick={() => void handleLogout()}
            aria-label="Sair da conta"
            className={cn(
              'flex h-11 w-11 items-center justify-center rounded-xl',
              'text-muted-foreground hover:bg-destructive/10 hover:text-destructive',
              'transition-colors duration-150',
              hovered === logoutIdx ? 'scale-110' : 'scale-100',
              'transition-transform duration-150',
            )}
          >
            <LogOut className="h-5 w-5" />
          </button>
          <span className="mt-0.5 h-1 w-1 opacity-0" />
        </div>
      </div>
    </>
  );
}
