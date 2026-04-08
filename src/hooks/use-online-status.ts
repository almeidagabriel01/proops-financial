'use client';

import { useState, useEffect } from 'react';

export function useOnlineStatus(): boolean {
  // Always start as true — matches SSR output and avoids hydration mismatch.
  // Real value is synced after mount via useEffect.
  const [isOnline, setIsOnline] = useState(true);

  useEffect(() => {
    // Sync actual status on mount before subscribing to events.
    // queueMicrotask avoids synchronous setState-in-effect lint warning.
    queueMicrotask(() => setIsOnline(navigator.onLine));

    function handleOnline() {
      setIsOnline(true);
    }
    function handleOffline() {
      setIsOnline(false);
    }

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return isOnline;
}
