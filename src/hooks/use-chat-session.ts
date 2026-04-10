'use client';

import { useState, useEffect } from 'react';
import { useChat } from '@ai-sdk/react';
import { DefaultChatTransport } from 'ai';
import { useUser } from '@/hooks/use-user';
import { usePlan } from '@/hooks/use-plan';
import { useChatHistory } from '@/hooks/use-chat-history';

/**
 * Encapsulates all chat state and handlers.
 * Consumed by both the /chat page and the FloatingChatPanel.
 */
export function useChatSession() {
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
  const quotaLoading = !profile;
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

  return {
    // State
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
    queriesLimit: aiMonthlyLimit,
    quotaLoading,
    canUseAudio,
    // Handlers
    handleSubmit,
    handleNewConversation,
    handleSwitchConversation,
  };
}
