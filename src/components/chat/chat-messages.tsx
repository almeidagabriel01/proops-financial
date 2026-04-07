'use client';

import { useEffect, useRef } from 'react';
import { isToolUIPart, getToolName, type UIMessage } from 'ai';
import type { ReactNode } from 'react';
import { ChatBubble } from './chat-bubble';

interface ChatMessagesProps {
  messages: UIMessage[];
  status: 'submitted' | 'streaming' | 'ready' | 'error';
}

function getMessageContent(msg: UIMessage): ReactNode {
  const nodes = msg.parts.map((part, i) => {
    if (part.type === 'text') {
      return <span key={i} className="whitespace-pre-wrap">{part.text}</span>;
    }
    if (isToolUIPart(part)) {
      const name = getToolName(part);
      const state = part.state;
      if (state === 'input-streaming' || state === 'input-available') {
        return (
          <span key={i} className="block text-sm italic text-muted-foreground">
            Executando: {name.replace(/_/g, ' ')}...
          </span>
        );
      }
      if (state === 'output-available') {
        return (
          <span key={i} className="block text-sm text-green-600">
            ✓ Concluído
          </span>
        );
      }
    }
    return null;
  });

  return <span className="flex flex-col gap-0.5">{nodes}</span>;
}

export function ChatMessages({ messages, status }: ChatMessagesProps) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, status]);

  if (messages.length === 0 && status === 'ready') {
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
        <ChatBubble key={msg.id} role={msg.role as 'user' | 'assistant'} content={getMessageContent(msg)} />
      ))}

      {/* Streaming indicator only while awaiting first token (not during active streaming) */}
      {status === 'submitted' && (
        <ChatBubble role="assistant" content="" isStreaming />
      )}

      <div ref={bottomRef} />
    </div>
  );
}
