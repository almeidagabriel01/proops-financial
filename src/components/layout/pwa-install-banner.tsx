'use client';

import { useEffect, useState } from 'react';
import { usePWAInstall } from '@/hooks/use-pwa-install';

const VISIT_KEY = 'finansim_visit_count';
const MIN_VISITS = 2;
const DISMISSED_KEY = 'finansim_pwa_dismissed';

export function PWAInstallBanner() {
  const { canInstall, install } = usePWAInstall();
  const [mounted, setMounted] = useState(false);
  const [show, setShow] = useState(false);

  useEffect(() => {
    queueMicrotask(() => setMounted(true));
  }, []);

  useEffect(() => {
    if (!mounted || !canInstall) return;
    if (sessionStorage.getItem(DISMISSED_KEY)) return;

    // Increment visit count
    const visits = parseInt(localStorage.getItem(VISIT_KEY) ?? '0', 10) + 1;
    localStorage.setItem(VISIT_KEY, String(visits));

    if (visits >= MIN_VISITS) {
      // queueMicrotask avoids synchronous setState-in-effect lint warning
      queueMicrotask(() => setShow(true));
    }
  }, [mounted, canInstall]);

  if (!show) return null;

  function handleDismiss() {
    setShow(false);
    sessionStorage.setItem(DISMISSED_KEY, '1');
  }

  async function handleInstall() {
    await install();
    setShow(false);
  }

  return (
    <div className="flex items-center justify-between gap-3 bg-primary px-4 py-2.5 text-primary-foreground">
      <p className="text-sm font-medium">Instale o Finansim na sua tela inicial</p>
      <div className="flex shrink-0 gap-2">
        <button
          onClick={handleInstall}
          className="rounded-md bg-primary-foreground px-3 py-1 text-xs font-semibold text-primary"
        >
          Instalar
        </button>
        <button
          onClick={handleDismiss}
          className="text-xs text-primary-foreground/70 hover:text-primary-foreground"
          aria-label="Fechar"
        >
          ✕
        </button>
      </div>
    </div>
  );
}
