'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { BarChart2, CreditCard, CalendarDays, MoreHorizontal } from 'lucide-react';
import { cn } from '@/lib/utils';
import { FabButton } from '@/components/layout/action-sheet';

const tabs = [
  { href: '/dashboard', icon: BarChart2, label: 'Início' },
  { href: '/transactions', icon: CreditCard, label: 'Transações' },
  // Slot central = FAB (não é uma rota)
  { href: '/financeiro', icon: CalendarDays, label: 'Financeiro' },
  { href: '/more', icon: MoreHorizontal, label: 'Mais' },
];

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-card">
      <div className="mx-auto flex max-w-screen-lg items-center justify-around">
        {/* Tabs antes do FAB */}
        {tabs.slice(0, 2).map((tab) => {
          const isActive = pathname === tab.href || pathname.startsWith(tab.href + '/');
          const Icon = tab.icon;
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={cn(
                'flex h-16 min-w-[44px] flex-col items-center justify-center gap-1 px-3 transition-colors',
                isActive ? 'text-primary' : 'text-muted-foreground hover:text-foreground',
              )}
            >
              <Icon className="h-5 w-5" />
              <span className={cn('text-[10px] font-medium', isActive ? 'text-primary' : '')}>
                {tab.label}
              </span>
            </Link>
          );
        })}

        {/* FAB central */}
        <FabButton />

        {/* Tabs depois do FAB */}
        {tabs.slice(2).map((tab) => {
          const isActive = pathname === tab.href || pathname.startsWith(tab.href + '/');
          const Icon = tab.icon;
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={cn(
                'flex h-16 min-w-[44px] flex-col items-center justify-center gap-1 px-3 transition-colors',
                isActive ? 'text-primary' : 'text-muted-foreground hover:text-foreground',
              )}
            >
              <Icon className="h-5 w-5" />
              <span className={cn('text-[10px] font-medium', isActive ? 'text-primary' : '')}>
                {tab.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
