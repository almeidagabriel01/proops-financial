'use client';

import { useChatSession } from '@/hooks/use-chat-session';
import { ChatMessages } from '@/components/chat/chat-messages';
import { ChatInput } from '@/components/chat/chat-input';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { PlusCircle, History, X } from 'lucide-react';

export default function ChatPage() {
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

  if (historyLoading) {
    return (
      <div className="flex h-full flex-col">
        <div className="flex-1 space-y-3 p-4">
          <Skeleton className="h-10 w-3/4" />
          <Skeleton className="ml-auto h-10 w-1/2" />
          <Skeleton className="h-10 w-2/3" />
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full overflow-hidden">
      {/* Desktop sidebar — histórico de conversas */}
      <aside className="hidden lg:flex lg:w-72 lg:shrink-0 lg:flex-col lg:border-r lg:border-border">
        <div className="flex shrink-0 items-center justify-between border-b border-border px-4 py-3">
          <h2 className="text-sm font-semibold text-foreground">Histórico</h2>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={handleNewConversation}
            title="Nova conversa"
          >
            <PlusCircle className="h-4 w-4" />
          </Button>
        </div>
        <div className="flex-1 overflow-y-auto">
          {conversations.length === 0 ? (
            <p className="px-4 py-6 text-center text-xs text-muted-foreground">
              Nenhuma conversa anterior.
            </p>
          ) : (
            <ul>
              {conversations.map((conv) => (
                <li key={conv.id}>
                  <button
                    onClick={() => handleSwitchConversation(conv.id)}
                    className="w-full px-4 py-2.5 text-left text-sm transition-colors hover:bg-muted"
                  >
                    <span className="block truncate font-medium">{conv.title ?? 'Conversa'}</span>
                    <span className="text-xs text-muted-foreground">
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
      </aside>

      {/* Área principal do chat.
          pb-[calc(4rem+env(safe-area-inset-bottom,0px))]: empurra o ChatInput
          acima do BottomNav fixo no mobile (64px + safe area iPhone).
          lg:pb-0: no desktop não há BottomNav. */}
      <div className="flex flex-1 flex-col overflow-hidden pb-[calc(4rem+env(safe-area-inset-bottom,0px))] lg:pb-0">
        {/* Header */}
        <div className="flex shrink-0 items-center justify-between border-b border-border px-4 py-3">
          <div>
            <h1 className="text-base font-semibold text-foreground">Assistente Financeiro</h1>
            <p className="text-xs text-muted-foreground">Pergunte sobre suas finanças em PT-BR</p>
          </div>
          {/* Botões mobile-only */}
          <div className="flex items-center gap-1 lg:hidden">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={handleNewConversation}
              title="Nova conversa"
            >
              <PlusCircle className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => setShowHistory((v) => !v)}
              title="Histórico"
            >
              {showHistory ? <X className="h-4 w-4" /> : <History className="h-4 w-4" />}
            </Button>
          </div>
        </div>

        {/* History drawer — mobile only */}
        {showHistory && (
          <div className="lg:hidden shrink-0 border-b border-border bg-muted/40 max-h-52 overflow-y-auto">
            {conversations.length === 0 ? (
              <p className="px-4 py-3 text-xs text-muted-foreground">Nenhuma conversa anterior.</p>
            ) : (
              <ul>
                {conversations.map((conv) => (
                  <li key={conv.id}>
                    <button
                      onClick={() => handleSwitchConversation(conv.id)}
                      className="w-full px-4 py-2.5 text-left text-sm transition-colors hover:bg-muted"
                    >
                      <span className="block truncate font-medium">{conv.title ?? 'Conversa'}</span>
                      <span className="text-xs text-muted-foreground">
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

        <ChatMessages messages={messages} status={status} />

        {showTimeoutWarning && (
          <div
            role="alert"
            className="mx-4 mb-2 shrink-0 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-700 dark:border-amber-800 dark:bg-amber-900/20 dark:text-amber-300"
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
    </div>
  );
}
