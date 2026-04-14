/// <reference lib="webworker" />
// Necessário: Next.js compila sw.ts sem lib DOM por padrão.
// WebWorker lib traz PushEvent, NotificationEvent e os overloads corretos
// de ServiceWorkerGlobalScope.addEventListener.

import type { PrecacheEntry, SerwistGlobalConfig } from 'serwist';
import { Serwist } from 'serwist';
import { defaultCache } from '@serwist/next/worker';

// Augment ServiceWorkerGlobalScope with Serwist's injected manifest
declare global {
  interface ServiceWorkerGlobalScope extends SerwistGlobalConfig {
    __SW_MANIFEST: (PrecacheEntry | string)[] | undefined;
  }
}

declare const self: ServiceWorkerGlobalScope;

// ── Push Notifications (C1.3) ──────────────────────────────────────────────
// Listeners devem ser registrados ANTES de serwist.addEventListeners()
// para garantir que capturem eventos durante a fase de install/activate.

self.addEventListener('push', (event: PushEvent) => {
  const data = (event.data?.json() as { title?: string; body?: string; url?: string }) ?? {};
  event.waitUntil(
    self.registration.showNotification(data.title ?? 'Finansim', {
      body: data.body ?? '',
      icon: '/icons/icon-192x192.png',
      badge: '/icons/badge-72x72.png',
      data: { url: data.url ?? '/dashboard' },
    })
  );
});

self.addEventListener('notificationclick', (event: NotificationEvent) => {
  event.notification.close();
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      const url = (event.notification.data as { url?: string })?.url ?? '/dashboard';
      const existing = clientList.find((c) => c.url === url && 'focus' in c);
      if (existing) return (existing as WindowClient).focus();
      return self.clients.openWindow(url);
    })
  );
});

// ── Serwist (precaching + runtime caching) ────────────────────────────────

const serwist = new Serwist({
  precacheEntries: self.__SW_MANIFEST,
  skipWaiting: true,
  clientsClaim: true,
  navigationPreload: false,
  runtimeCaching: defaultCache,
});

serwist.addEventListeners();
