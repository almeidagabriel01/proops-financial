'use client';

import { useState, useEffect } from 'react';
import { useChat } from '@ai-sdk/react';
import { DefaultChatTransport } from 'ai';
import { useUser } from '@/hooks/use-user';
import { usePlan } from '@/hooks/use-plan';
import { useChatHistory } from '@/hooks/use-chat-history';
import { ChatMessages } from '@/components/chat/chat-messages';
import { ChatInput } from '@/components/chat/chat-input';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { PlusCircle, History, X } from 'lucide-react';

export default function ChatPage() {
  const { user, profile } = useUser();
  const { aiMonthlyLimit, canUseAudio } = usePlan();
  const {
    initialMessages,
    historyLoading,
    conversations,
    saveMessage,
    startNewConversation,
    switchConversation,
  } = useChatHistory(user?.id ?? null);
  const [input, setInput] = useState('');
  const [showTimeoutWarning, setShowTimeoutWarning] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  // Optimistic counter — increments immediately on send, avoids needing page reload
  const [localQueriesOffset, setLocalQueriesOffset] = useState(0);

  const { messages, setMessages, sendMessage, status, error } = useChat({
    transport: new DefaultChatTransport({ api: '/api/chat' }),
    onFinish: ({ message }) => {
      const text = message.parts
        .filter((p): p is { type: 'text'; text: string } => p.type === 'text')
        .map((p) => p.text)
        .join('');
      saveMessage('assistant', text);
    },
  });

  useEffect(() => {
    if (!historyLoading) {
      setMessages(initialMessages);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [historyLoading, initialMessages]);

  useEffect(() => {
    if (status !== 'streaming' && status !== 'submitted') {
      setShowTimeoutWarning(false);
      return;
    }
    const timer = setTimeout(() => setShowTimeoutWarning(true), 30_000);
    return () => clearTimeout(timer);
  }, [status]);

  const isLoading = status === 'submitted' || status === 'streaming';
  const queriesUsed = (profile?.ai_queries_this_month ?? 0) + localQueriesOffset;

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const trimmed = input.trim();
    if (!trimmed || isLoading) return;
    saveMessage('user', trimmed);
    sendMessage({ text: trimmed });
    setInput('');
    setLocalQueriesOffset((n) => n + 1);
  }

  function handleNewConversation() {
    startNewConversation();
    setMessages([]);
    setLocalQueriesOffset(0);
    setShowHistory(false);
  }

  function handleSwitchConversation(id: string) {
    switchConversation(id);
    setMessages([]);
    setLocalQueriesOffset(0);
    setShowHistory(false);
  }

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
    <div className="flex h-full flex-col overflow-hidden">
      {/* Header */}
      <div className="flex shrink-0 items-center justify-between border-b border-border px-4 py-3">
        <div>
          <h1 className="text-base font-semibold text-foreground">Assistente Financeiro</h1>
          <p className="text-xs text-muted-foreground">Pergunte sobre suas finanças em PT-BR</p>
        </div>
        <div className="flex items-center gap-1">
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

      {/* History drawer */}
      {showHistory && (
        <div className="shrink-0 border-b border-border bg-muted/40 max-h-52 overflow-y-auto">
          {conversations.length === 0 ? (
            <p className="px-4 py-3 text-xs text-muted-foreground">Nenhuma conversa anterior.</p>
          ) : (
            <ul>
              {conversations.map((conv) => (
                <li key={conv.id}>
                  <button
                    onClick={() => handleSwitchConversation(conv.id)}
                    className="w-full px-4 py-2.5 text-left text-sm hover:bg-muted transition-colors"
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
        queriesLimit={aiMonthlyLimit}
        error={error}
        canUseAudio={canUseAudio}
      />
    </div>
  );
}
