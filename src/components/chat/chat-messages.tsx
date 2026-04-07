'use client';

import { useEffect, useRef } from 'react';
import type { UIMessage } from 'ai';
import { ChatBubble } from './chat-bubble';

interface ChatMessagesProps {
  messages: UIMessage[];
  isLoading: boolean;
}

function getTextContent(msg: UIMessage): string {
  return msg.parts
    .filter((p): p is { type: 'text'; text: string } => p.type === 'text')
    .map((p) => p.text)
    .join('');
}

export function ChatMessages({ messages, isLoading }: ChatMessagesProps) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  if (messages.length === 0 && !isLoading) {
    return (
      <div className="flex flex-1 items-center justify-center p-6 text-center">
        <div>
          <p className="text-sm font-medium text-foreground">Olá! Como posso ajudar?</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Pergunte sobre seus gastos, categorias ou compare com meses anteriores.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col gap-3 overflow-y-auto p-4">
      {messages.map((msg) => (
        <ChatBubble key={msg.id} role={msg.role as 'user' | 'assistant'} content={getTextContent(msg)} />
      ))}

      {/* Streaming indicator for in-progress response */}
      {isLoading && (
        <ChatBubble role="assistant" content="" isStreaming />
      )}

      <div ref={bottomRef} />
    </div>
  );
}
