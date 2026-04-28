'use client';

import { useState, useEffect } from 'react';
import { Bell, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { subscribeToPush } from '@/lib/push/subscribe';

const DISMISSED_KEY = 'push_banner_dismissed_until';
const DISMISS_DAYS = 7;

export function PushPermissionBanner() {
  const [visible, setVisible] = useState(false);
  const [requesting, setRequesting] = useState(false);

  useEffect(() => {
    // Não exibir se o browser não suporta push
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) return;
    // Não exibir se permissão já foi concedida ou negada permanentemente
    if (Notification.permission !== 'default') return;
    // Não exibir se usuário dispensou dentro de 7 dias
    const dismissedUntil = localStorage.getItem(DISMISSED_KEY);
    if (dismissedUntil && Date.now() < Number(dismissedUntil)) return;

    setVisible(true);
  }, []);

  const handleActivate = async () => {
    setRequesting(true);
    try {
      const permission = await Notification.requestPermission();
      if (permission === 'granted') {
        await subscribeToPush();
      }
    } finally {
      setRequesting(false);
      setVisible(false);
    }
  };

  const handleDismiss = () => {
    const until = Date.now() + DISMISS_DAYS * 24 * 60 * 60 * 1000;
    localStorage.setItem(DISMISSED_KEY, String(until));
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div className="flex items-start gap-3 rounded-xl border border-border bg-muted/40 px-4 py-3">
      <Bell className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
      <p className="flex-1 text-sm text-muted-foreground">
        Ative notificações para receber alertas de orçamento
      </p>
      <div className="flex shrink-0 items-center gap-2">
        <Button
          size="sm"
          variant="outline"
          className="h-7 px-2 text-xs"
          onClick={handleDismiss}
          disabled={requesting}
        >
          Agora não
        </Button>
        <Button
          size="sm"
          className="h-7 px-3 text-xs"
          onClick={() => void handleActivate()}
          disabled={requesting}
        >
          Ativar
        </Button>
        <button
          onClick={handleDismiss}
          className="text-muted-foreground/60 transition-colors hover:text-muted-foreground"
          aria-label="Fechar banner de notificações"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}
