'use client';

import { PlusCircle, History, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useChatSession } from '@/hooks/use-chat-session';
import { ChatMessages } from '@/components/chat/chat-messages';
import { ChatInput } from '@/components/chat/chat-input';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';

interface FloatingChatPanelProps {
  open: boolean;
  onClose: () => void;
}

export function FloatingChatPanel({ open, onClose }: FloatingChatPanelProps) {
  const {
    input,
    setInput,
    messages,
    status,
    error,
    isLoading,
    historyLoading,
    showTimeoutWarning,
    showHistory,
    setShowHistory,
    conversations,
    queriesUsed,
    queriesLimit,
    quotaLoading,
    canUseAudio,
    handleSubmit,
    handleNewConversation,
    handleSwitchConversation,
  } = useChatSession();

  return (
    <div
      className={cn(
        'fixed bottom-20 right-6 z-50',
        'w-[400px] h-[520px]',
        'flex flex-col overflow-hidden',
        'rounded-2xl border border-border bg-card shadow-2xl',
        'transition-all duration-200 origin-bottom-right',
        open ? 'scale-100 opacity-100 pointer-events-auto' : 'scale-95 opacity-0 pointer-events-none',
      )}
    >
      {/* Header do painel */}
      <div className="flex shrink-0 items-center justify-between border-b border-border bg-card px-4 py-3">
        <div>
          <h2 className="text-sm font-semibold text-foreground">Assistente Financeiro</h2>
          <p className="text-xs text-muted-foreground">Pergunte sobre suas finanças</p>
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={handleNewConversation}
            title="Nova conversa"
          >
            <PlusCircle className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={() => setShowHistory((v) => !v)}
            title="Histórico"
          >
            {showHistory ? <X className="h-3.5 w-3.5" /> : <History className="h-3.5 w-3.5" />}
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={onClose}
            title="Fechar"
          >
            <X className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      {/* Histórico */}
      {showHistory && (
        <div className="shrink-0 border-b border-border bg-muted/40 max-h-40 overflow-y-auto">
          {conversations.length === 0 ? (
            <p className="px-4 py-3 text-xs text-muted-foreground">Nenhuma conversa anterior.</p>
          ) : (
            <ul>
              {conversations.map((conv) => (
                <li key={conv.id}>
                  <button
                    onClick={() => handleSwitchConversation(conv.id)}
                    className="w-full px-4 py-2 text-left text-xs hover:bg-muted transition-colors"
                  >
                    <span className="block truncate font-medium">{conv.title ?? 'Conversa'}</span>
                    <span className="text-[11px] text-muted-foreground">
                      {new Date(conv.last_message_at).toLocaleDateString('pt-BR', {
                        day: '2-digit',
                        month: '2-digit',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {/* Conteúdo */}
      {historyLoading ? (
        <div className="flex-1 space-y-3 p-4">
          <Skeleton className="h-8 w-3/4" />
          <Skeleton className="ml-auto h-8 w-1/2" />
          <Skeleton className="h-8 w-2/3" />
        </div>
      ) : (
        <ChatMessages messages={messages} status={status} />
      )}

      {showTimeoutWarning && (
        <div
          role="alert"
          className="mx-3 mb-2 shrink-0 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-700 dark:border-amber-800 dark:bg-amber-900/20 dark:text-amber-300"
        >
          A resposta está demorando mais que o esperado.
        </div>
      )}

      <ChatInput
        value={input}
        onChange={setInput}
        onSubmit={handleSubmit}
        isLoading={isLoading}
        queriesUsed={queriesUsed}
        queriesLimit={queriesLimit}
        quotaLoading={quotaLoading}
        error={error}
        canUseAudio={canUseAudio}
      />
    </div>
  );
}
