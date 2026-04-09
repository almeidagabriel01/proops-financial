'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';

const subTabs = [
  { href: '/financeiro/contas', label: 'Contas' },
  { href: '/financeiro/parcelas', label: 'Parcelas' },
  { href: '/financeiro/recorrentes', label: 'Recorrentes' },
  { href: '/financeiro/fluxo', label: 'Fluxo' },
];

export function FinanceiroSubNav() {
  const pathname = usePathname();

  return (
    <div className="sticky top-0 z-40 border-b border-border bg-background">
      <div className="flex overflow-x-auto px-4 scrollbar-none">
        {subTabs.map((tab) => {
          const isActive = pathname.startsWith(tab.href);
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={cn(
                'shrink-0 border-b-2 px-4 py-3 text-sm font-medium transition-colors',
                isActive
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground hover:text-foreground',
              )}
            >
              {tab.label}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
