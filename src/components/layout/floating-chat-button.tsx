'use client';

import { useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { Bot, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useIsDesktop } from '@/hooks/use-is-desktop';
import { FloatingChatPanel } from '@/components/layout/floating-chat-panel';

export function FloatingChatButton() {
  const [panelOpen, setPanelOpen] = useState(false);
  const pathname = usePathname();
  const router = useRouter();
  const isDesktop = useIsDesktop();

  const isOnChat = pathname === '/chat';

  function handleClick() {
    if (isDesktop) {
      setPanelOpen((v) => !v);
    } else {
      router.push('/chat');
    }
  }

  return (
    <>
      <button
        onClick={handleClick}
        aria-label={panelOpen ? 'Fechar assistente' : 'Abrir assistente financeiro'}
        style={!isDesktop ? { bottom: 'calc(5rem + env(safe-area-inset-bottom, 0px))' } : undefined}
        className={cn(
          'fixed z-40 flex h-12 w-12 items-center justify-center rounded-full',
          'bg-secondary text-secondary-foreground shadow-lg ring-1 ring-border',
          'transition-all duration-300 ease-in-out',
          // Mobile: safe area via inline style acima
          'right-4',
          // Desktop: closer to edge
          'lg:bottom-6 lg:right-6',
          // Hover only when visible
          !isOnChat && 'hover:scale-110 hover:shadow-xl',
          // Fade + scale when on chat page
          isOnChat
            ? 'opacity-0 scale-75 pointer-events-none'
            : 'opacity-100 scale-100 pointer-events-auto',
        )}
      >
        {panelOpen ? (
          <X className="h-5 w-5" />
        ) : (
          <Bot className="h-5 w-5" />
        )}
      </button>

      {/* Painel flutuante: apenas desktop */}
      {isDesktop && (
        <FloatingChatPanel open={panelOpen} onClose={() => setPanelOpen(false)} />
      )}
    </>
  );
}
