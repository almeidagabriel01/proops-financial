'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

export function MobileMenuButton() {
  const [open, setOpen] = useState(false);

  // Close on ESC
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open]);

  // Prevent scroll when open
  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [open]);

  return (
    <>
      <button
        onClick={() => setOpen((v) => !v)}
        aria-label={open ? 'Fechar menu' : 'Abrir menu'}
        aria-expanded={open}
        className="flex h-9 w-9 items-center justify-center rounded-lg text-zinc-600 transition-colors hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-900 sm:hidden"
      >
        {open ? (
          <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        ) : (
          <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        )}
      </button>

      {open && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 top-14 z-40 bg-black/20 sm:hidden"
            onClick={() => setOpen(false)}
            aria-hidden="true"
          />
          {/* Drawer */}
          <nav
            className="absolute inset-x-0 top-full z-50 border-b border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950 sm:hidden"
            aria-label="Menu mobile"
          >
            <ul className="flex flex-col gap-2">
              <li>
                <Link
                  href="/login"
                  onClick={() => setOpen(false)}
                  className="flex h-11 w-full items-center rounded-lg px-4 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-900"
                >
                  Entrar
                </Link>
              </li>
              <li>
                <Link
                  href="/signup"
                  onClick={() => setOpen(false)}
                  className="flex h-11 w-full items-center justify-center rounded-lg bg-zinc-950 px-4 text-sm font-semibold text-white transition-colors hover:bg-zinc-800 dark:bg-white dark:text-zinc-950 dark:hover:bg-zinc-100"
                >
                  Começar grátis
                </Link>
              </li>
            </ul>
          </nav>
        </>
      )}
    </>
  );
}
