'use client';

import { useRef, type FormEvent, type KeyboardEvent } from 'react';
import { Button } from '@/components/ui/button';
import { SendHorizonal } from 'lucide-react';
import Link from 'next/link';
import { AudioRecorder } from '@/components/chat/audio-recorder';

interface ChatInputProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit: (e: FormEvent<HTMLFormElement>) => void;
  isLoading: boolean;
  queriesUsed: number;
  queriesLimit: number;
  error?: Error;
  canUseAudio?: boolean;
}

export function ChatInput({
  value,
  onChange,
  onSubmit,
  isLoading,
  queriesUsed,
  queriesLimit,
  error,
  canUseAudio = false,
}: ChatInputProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const queriesLeft = Math.max(0, queriesLimit - queriesUsed);
  const isExhausted = queriesLeft === 0;

  function handleKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (!isExhausted && !isLoading && value.trim()) {
        e.currentTarget.form?.requestSubmit();
      }
    }
  }

  function handleChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
    onChange(e.target.value);
    // Auto-resize
    const ta = textareaRef.current;
    if (ta) {
      ta.style.height = 'auto';
      ta.style.height = `${Math.min(ta.scrollHeight, 120)}px`;
    }
  }

  return (
    <div className="border-t border-border bg-card px-4 py-3">
      {/* Error message */}
      {error && (
        <p className="mb-2 text-xs text-destructive">
          {error.message?.includes('429')
            ? 'Limite mensal atingido.'
            : 'Erro ao processar sua pergunta. Tente novamente.'}
        </p>
      )}

      {/* Query counter */}
      <p className="mb-2 text-xs text-muted-foreground">
        {isExhausted ? (
          <>
            Limite mensal atingido.{' '}
            <Link href="/settings?tab=plano" className="font-medium underline">
              Ver planos
            </Link>
          </>
        ) : (
          `${queriesLeft} de ${queriesLimit} perguntas restantes este mês`
        )}
      </p>

      <form onSubmit={onSubmit} className="flex items-end gap-2">
        {canUseAudio && (
          <AudioRecorder
            onTranscript={(text) => onChange(value ? `${value} ${text}` : text)}
            disabled={isLoading || isExhausted}
          />
        )}
        <textarea
          ref={textareaRef}
          rows={1}
          value={value}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          disabled={isLoading || isExhausted}
          placeholder={isExhausted ? 'Limite atingido' : 'Pergunte sobre suas finanças...'}
          className="flex-1 resize-none overflow-hidden rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
          style={{ minHeight: '40px', maxHeight: '120px' }}
        />
        <Button
          type="submit"
          size="icon"
          disabled={!value.trim() || isLoading || isExhausted}
          className="h-10 w-10 shrink-0 rounded-xl"
        >
          <SendHorizonal className="h-4 w-4" />
        </Button>
      </form>
    </div>
  );
}
