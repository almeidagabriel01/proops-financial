'use client';

import { useTheme } from 'next-themes';
import { useEffect, useRef, useState } from 'react';
import { Sun, Moon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ThemeToggleProps {
  className?: string;
  showLabel?: boolean;
}

export function ThemeToggle({ className, showLabel = false }: ThemeToggleProps) {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => { queueMicrotask(() => setMounted(true)); }, []);

  if (!mounted) {
    return <div className={cn('flex h-9 w-9 items-center justify-center rounded-lg', className)} />;
  }

  const isDark = resolvedTheme === 'dark';
  const Icon = isDark ? Sun : Moon;
  const label = isDark ? 'Mudar para tema claro' : 'Mudar para tema escuro';
  const next = isDark ? 'light' : 'dark';

  async function handleToggle() {
    const btn = buttonRef.current;
    if (!btn) { setTheme(next); return; }

    const rect = btn.getBoundingClientRect();
    const x = Math.round((rect.left + rect.right) / 2);
    const y = Math.round((rect.top + rect.bottom) / 2);

    // Maximum radius to cover the full screen from the button
    const radius = Math.hypot(
      Math.max(x, window.innerWidth - x),
      Math.max(y, window.innerHeight - y),
    );

    // Use View Transitions API for modern circular reveal
    if (document.startViewTransition) {
      const transition = document.startViewTransition(() => {
        setTheme(next);
      });

      await transition.ready;

      document.documentElement.animate(
        {
          clipPath: [
            `circle(0px at ${x}px ${y}px)`,
            `circle(${radius}px at ${x}px ${y}px)`,
          ],
        },
        {
          duration: 450,
          easing: 'cubic-bezier(0.25, 0.46, 0.45, 0.94)',
          pseudoElement: '::view-transition-new(root)',
        },
      );
      return;
    }

    // Fallback for browsers without View Transitions API
    const bgColor = getComputedStyle(document.documentElement).backgroundColor;
    const overlay = document.createElement('div');
    Object.assign(overlay.style, {
      position: 'fixed',
      inset: '0',
      zIndex: '9999',
      pointerEvents: 'none',
      background: bgColor,
      clipPath: `circle(${radius}px at ${x}px ${y}px)`,
    });
    document.body.appendChild(overlay);
    document.documentElement.classList.add('transitioning');

    requestAnimationFrame(() => {
      setTheme(next);
      void overlay.offsetHeight;
      overlay.style.transition = 'clip-path 450ms cubic-bezier(0.25, 0.46, 0.45, 0.94)';
      overlay.style.clipPath = `circle(0px at ${x}px ${y}px)`;
    });

    setTimeout(() => {
      overlay.remove();
      document.documentElement.classList.remove('transitioning');
    }, 500);
  }

  return (
    <button
      ref={buttonRef}
      onClick={handleToggle}
      aria-label={label}
      title={label}
      className={cn(
        'flex h-9 w-9 items-center justify-center rounded-lg cursor-pointer',
        'text-muted-foreground hover:bg-muted hover:text-foreground',
        'transition-colors duration-200',
        className,
      )}
    >
      <Icon className="h-4 w-4" />
      {showLabel && <span className="ml-2 text-sm font-medium">{isDark ? 'Claro' : 'Escuro'}</span>}
    </button>
  );
}
