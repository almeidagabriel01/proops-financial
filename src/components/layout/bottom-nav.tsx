'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { BarChart2, CreditCard, MessageCircle, Plus, Settings } from 'lucide-react';
import { cn } from '@/lib/utils';

const tabs = [
  { href: '/dashboard', icon: BarChart2, label: 'Início' },
  { href: '/transactions', icon: CreditCard, label: 'Transações' },
  { href: '/import', icon: Plus, label: 'Importar', highlight: true },
  { href: '/chat', icon: MessageCircle, label: 'Chat', disabled: true },
  { href: '/settings', icon: Settings, label: 'Config' },
];

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-card">
      <div className="mx-auto flex max-w-screen-lg items-center justify-around">
        {tabs.map((tab) => {
          const isActive = pathname === tab.href || pathname.startsWith(tab.href + '/');
          const Icon = tab.icon;

          if (tab.highlight) {
            return (
              <Link
                key={tab.href}
                href={tab.href}
                className="flex -translate-y-3 flex-col items-center"
              >
                <span className="flex h-12 w-12 items-center justify-center rounded-full bg-primary shadow-lg">
                  <Icon className="h-6 w-6 text-primary-foreground" />
                </span>
                <span className="mt-1 text-[10px] font-medium text-primary">{tab.label}</span>
              </Link>
            );
          }

          if (tab.disabled) {
            return (
              <span
                key={tab.href}
                className="flex h-16 flex-col items-center justify-center gap-1 px-3 opacity-40"
                aria-disabled="true"
              >
                <Icon className="h-5 w-5 text-muted-foreground" />
                <span className="text-[10px] text-muted-foreground">{tab.label}</span>
              </span>
            );
          }

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
