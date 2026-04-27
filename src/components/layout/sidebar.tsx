'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  BarChart2,
  CreditCard,
  CalendarDays,
  MessageCircle,
  Wallet,
  Target,
  Upload,
  Settings,
  ChevronsLeft,
  ChevronsRight,
  LogOut,
  ChevronDown,
  ChevronRight as ChevronRightIcon,
} from 'lucide-react';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import { useSidebar } from '@/components/layout/sidebar-context';
import { ThemeToggle } from '@/components/layout/theme-toggle';
import { createClient } from '@/lib/supabase/client';

interface NavItem {
  href: string;
  icon: React.ElementType;
  label: string;
  children?: NavItem[];
}

const navItems: NavItem[] = [
  { href: '/dashboard', icon: BarChart2, label: 'Início' },
  { href: '/transactions', icon: CreditCard, label: 'Transações' },
  {
    href: '/financeiro',
    icon: CalendarDays,
    label: 'Financeiro',
    children: [
      { href: '/financeiro/contas', icon: CalendarDays, label: 'Contas' },
      { href: '/financeiro/parcelas', icon: CalendarDays, label: 'Parcelas' },
      { href: '/financeiro/recorrentes', icon: CalendarDays, label: 'Recorrentes' },
      { href: '/financeiro/fluxo', icon: CalendarDays, label: 'Fluxo' },
    ],
  },
];

const secondaryItems: NavItem[] = [
  { href: '/chat', icon: MessageCircle, label: 'Chat IA' },
  { href: '/more/orcamentos', icon: Wallet, label: 'Orçamentos' },
  { href: '/more/objetivos', icon: Target, label: 'Objetivos' },
  { href: '/import', icon: Upload, label: 'Importar' },
];

const bottomItems: NavItem[] = [
  { href: '/settings', icon: Settings, label: 'Configurações' },
];

interface SidebarNavItemProps {
  item: NavItem;
  collapsed: boolean;
  depth?: number;
}

function SidebarNavItem({ item, collapsed, depth = 0 }: SidebarNavItemProps) {
  const pathname = usePathname();
  const [open, setOpen] = useState(() => pathname.startsWith(item.href + '/'));
  const isActive =
    pathname === item.href || pathname.startsWith(item.href + '/');
  const hasChildren = item.children && item.children.length > 0;
  const Icon = item.icon;

  if (hasChildren && !collapsed) {
    return (
      <div>
        <button
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          className={cn(
            'flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
            isActive
              ? 'bg-sidebar-accent text-sidebar-accent-foreground border-l-2 border-sidebar-primary'
              : 'text-sidebar-foreground hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground',
            depth > 0 && 'pl-6 text-xs',
          )}
        >
          <Icon className="h-4 w-4 shrink-0" />
          <span className="flex-1 truncate">{item.label}</span>
          {open ? (
            <ChevronDown className="h-3.5 w-3.5 shrink-0" />
          ) : (
            <ChevronRightIcon className="h-3.5 w-3.5 shrink-0" />
          )}
        </button>
        {open && (
          <div className="ml-4 mt-0.5 space-y-0.5 border-l border-sidebar-border pl-3">
            {item.children!.map((child) => (
              <SidebarNavItem key={child.href} item={child} collapsed={false} depth={depth + 1} />
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <Link
      href={item.href}
      aria-current={isActive ? 'page' : undefined}
      title={collapsed ? item.label : undefined}
      className={cn(
        'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
        isActive
          ? 'bg-sidebar-accent text-sidebar-accent-foreground border-l-2 border-sidebar-primary'
          : 'text-sidebar-foreground hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground',
        collapsed && 'justify-center px-0',
        depth > 0 && 'pl-6 text-xs',
      )}
    >
      <Icon className="h-4 w-4 shrink-0" />
      {!collapsed && <span className="truncate">{item.label}</span>}
    </Link>
  );
}

interface SidebarProps {
  userName?: string | null;
  userEmail?: string;
  className?: string;
}

export function Sidebar({ userName, userEmail, className }: SidebarProps) {
  const { collapsed, toggle } = useSidebar();
  const router = useRouter();

  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push('/login');
    router.refresh();
  }

  return (
    <aside
      className={cn(
        'flex flex-col border-r border-sidebar-border bg-sidebar',
        'transition-all duration-300 ease-in-out',
        collapsed ? 'w-[68px]' : 'w-64',
        'h-dvh shrink-0',
        className,
      )}
    >
      {/* Logo */}
      <div
        className={cn(
          'flex h-14 shrink-0 items-center border-b border-sidebar-border px-4',
          collapsed && 'justify-center px-0',
        )}
      >
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary text-sm font-bold text-primary-foreground">
          F
        </div>
        {!collapsed && (
          <span className="ml-2 font-semibold text-sidebar-foreground">Finansim</span>
        )}
      </div>

      {/* Nav principal */}
      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-0.5">
        {navItems.map((item) => (
          <SidebarNavItem key={item.href} item={item} collapsed={collapsed} />
        ))}

        <div className="my-3 border-t border-sidebar-border" />

        {secondaryItems.map((item) => (
          <SidebarNavItem key={item.href} item={item} collapsed={collapsed} />
        ))}

        <div className="my-3 border-t border-sidebar-border" />

        {bottomItems.map((item) => (
          <SidebarNavItem key={item.href} item={item} collapsed={collapsed} />
        ))}
      </nav>

      {/* Footer */}
      <div className="shrink-0 border-t border-sidebar-border px-3 py-3 space-y-1">
        {/* Theme toggle + collapse */}
        <div className={cn('flex items-center', collapsed ? 'justify-center' : 'justify-between')}>
          <ThemeToggle
            className={cn(
              'text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground',
              collapsed && 'w-full justify-center',
            )}
            showLabel={false}
          />
          {!collapsed && (
            <button
              onClick={toggle}
              aria-label="Recolher sidebar"
              className="flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-colors"
            >
              <ChevronsLeft className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* Collapse button when collapsed */}
        {collapsed && (
          <button
            onClick={toggle}
            aria-label="Expandir sidebar"
            className="flex w-full items-center justify-center rounded-lg py-2 text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-colors"
          >
            <ChevronsRight className="h-4 w-4" />
          </button>
        )}

        {/* User info */}
        {!collapsed && (
          <div className="flex items-center gap-2 rounded-lg px-2 py-2">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/15 text-xs font-semibold text-primary">
              {(userName ?? userEmail ?? 'U').charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0 flex-1">
              {userName && (
                <p className="truncate text-xs font-medium text-sidebar-foreground">{userName}</p>
              )}
              {userEmail && (
                <p className="truncate text-[11px] text-muted-foreground">{userEmail}</p>
              )}
            </div>
            <button
              onClick={handleLogout}
              aria-label="Sair"
              title="Sair"
              className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-muted-foreground hover:bg-sidebar-accent hover:text-destructive transition-colors"
            >
              <LogOut className="h-3.5 w-3.5" />
            </button>
          </div>
        )}

        {collapsed && (
          <button
            onClick={handleLogout}
            aria-label="Sair"
            title="Sair"
            className="flex w-full items-center justify-center rounded-lg py-2 text-muted-foreground hover:bg-sidebar-accent hover:text-destructive transition-colors"
          >
            <LogOut className="h-4 w-4" />
          </button>
        )}
      </div>
    </aside>
  );
}
