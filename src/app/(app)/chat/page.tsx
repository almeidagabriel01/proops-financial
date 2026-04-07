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

export default function ChatPage() {
  const { user, profile } = useUser();
  const { aiMonthlyLimit, canUseAudio } = usePlan();
  const { initialMessages, historyLoading, saveMessage } = useChatHistory(user?.id ?? null);
  const [input, setInput] = useState('');

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

  // Sync DB history once loaded — useChat ignores messages prop after initial mount
  useEffect(() => {
    if (!historyLoading && initialMessages.length > 0) {
      setMessages(initialMessages);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [historyLoading]);

  const isLoading = status === 'submitted' || status === 'streaming';
  const queriesUsed = profile?.ai_queries_this_month ?? 0;


  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const trimmed = input.trim();
    if (!trimmed || isLoading) return;
    saveMessage('user', trimmed);
    sendMessage({ text: trimmed });
    setInput('');
  }

  if (historyLoading) {
    return (
      <div className="flex h-[calc(100dvh-8rem)] flex-col">
        <div className="flex-1 space-y-3 p-4">
          <Skeleton className="h-10 w-3/4" />
          <Skeleton className="ml-auto h-10 w-1/2" />
          <Skeleton className="h-10 w-2/3" />
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-[calc(100dvh-8rem)] flex-col">
      <div className="border-b border-border px-4 py-3">
        <h1 className="text-base font-semibold text-foreground">Assistente Financeiro</h1>
        <p className="text-xs text-muted-foreground">Pergunte sobre suas finanças em PT-BR</p>
      </div>

      <ChatMessages messages={messages} status={status} />

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
