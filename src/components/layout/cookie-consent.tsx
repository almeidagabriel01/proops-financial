'use client';

import { useSyncExternalStore, useState } from 'react';
import { Button } from '@/components/ui/button';

const STORAGE_KEY = 'cookie_consent';

export type ConsentChoice = 'accepted' | 'rejected';

export function getConsentChoice(): ConsentChoice | null {
  if (typeof window === 'undefined') return null;
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored === 'accepted' || stored === 'rejected') return stored;
  return null;
}

// Snapshot functions for useSyncExternalStore.
// localStorage doesn't emit same-window storage events, so subscribe is a no-op.
// getServerSnapshot always returns false — banner is client-only, no SSR mismatch.
function getSnapshot() {
  const stored = localStorage.getItem(STORAGE_KEY);
  return stored !== 'accepted' && stored !== 'rejected';
}
function getServerSnapshot() {
  return false;
}

export function CookieConsent() {
  // `needsConsent` is true until the user picks a choice (reads live localStorage).
  // Inline no-op subscribe avoids an unused-parameter lint warning.
  const needsConsent = useSyncExternalStore(() => () => {}, getSnapshot, getServerSnapshot);
  // After a choice, force a re-render so useSyncExternalStore reads the updated value.
  const [, forceUpdate] = useState(0);

  function handleChoice(choice: ConsentChoice) {
    localStorage.setItem(STORAGE_KEY, choice);
    forceUpdate((n) => n + 1);
  }

  if (!needsConsent) return null;

  return (
    <div
      role="dialog"
      aria-label="Consentimento de cookies"
      className="fixed bottom-20 left-0 right-0 z-50 mx-auto max-w-lg px-4 md:bottom-6"
    >
      <div className="rounded-xl border border-border bg-background p-4 shadow-lg">
        <p className="mb-3 text-sm text-muted-foreground">
          Usamos cookies essenciais para autenticação e, opcionalmente, ferramentas de análise para
          melhorar o serviço. Seus dados financeiros nunca são compartilhados com terceiros.{' '}
          <a href="/privacy" className="underline underline-offset-2">
            Política de Privacidade
          </a>
          .
        </p>
        <div className="flex gap-2">
          <Button size="sm" className="flex-1" onClick={() => handleChoice('accepted')}>
            Aceitar
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="flex-1"
            onClick={() => handleChoice('rejected')}
          >
            Recusar
          </Button>
        </div>
      </div>
    </div>
  );
}
