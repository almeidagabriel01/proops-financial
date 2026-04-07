import type { ReactNode } from 'react';

interface ChatBubbleProps {
  role: 'user' | 'assistant';
  content: ReactNode;
  isStreaming?: boolean;
}

export function ChatBubble({ role, content, isStreaming = false }: ChatBubbleProps) {
  const isUser = role === 'user';

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div
        className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
          isUser
            ? 'rounded-tr-sm bg-primary text-primary-foreground'
            : 'rounded-tl-sm bg-muted text-foreground'
        }`}
      >
        {isStreaming && !content ? (
          <span className="inline-flex gap-1">
            <span className="animate-bounce [animation-delay:-0.3s]">•</span>
            <span className="animate-bounce [animation-delay:-0.15s]">•</span>
            <span className="animate-bounce">•</span>
          </span>
        ) : (
          <span className="whitespace-pre-wrap">{content}</span>
        )}
      </div>
    </div>
  );
}
