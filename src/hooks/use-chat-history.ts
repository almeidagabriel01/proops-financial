'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { UIMessage } from 'ai';
import type { SupabaseClient } from '@supabase/supabase-js';

export interface Conversation {
  id: string;
  title: string | null;
  last_message_at: string;
  created_at: string;
}

interface UseChatHistoryResult {
  initialMessages: UIMessage[];
  historyLoading: boolean;
  conversations: Conversation[];
  activeConversationId: string | null;
  saveMessage: (role: 'user' | 'assistant', content: string) => Promise<void>;
  startNewConversation: () => void;
  switchConversation: (id: string) => void;
}

const STORAGE_KEY_PREFIX = 'finansim_conv_';

function readStoredConvId(userId: string): string | null {
  try {
    return localStorage.getItem(`${STORAGE_KEY_PREFIX}${userId}`);
  } catch {
    return null;
  }
}

function writeStoredConvId(userId: string, id: string | null): void {
  try {
    const key = `${STORAGE_KEY_PREFIX}${userId}`;
    if (id) localStorage.setItem(key, id);
    else localStorage.removeItem(key);
  } catch {
    // localStorage unavailable (SSR / private mode) — graceful degradation
  }
}

export function useChatHistory(userId: string | null): UseChatHistoryResult {
  const [initialMessages, setInitialMessages] = useState<UIMessage[]>([]);
  const [hasLoaded, setHasLoaded] = useState(false);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const clientRef = useRef<SupabaseClient | null>(null);

  // Loading while userId is present but initial fetch hasn't finished yet.
  const historyLoading = !hasLoaded && userId !== null;

  function getClient() {
    if (!clientRef.current) clientRef.current = createClient();
    return clientRef.current;
  }

  // Fetches conversation list + messages for a given conversationId.
  // Returns data instead of calling setState — callers apply it.
  const fetchHistory = useCallback(
    async (conversationId: string | null) => {
      const supabase = getClient();

      const { data: convData } = await supabase
        .from('conversations')
        .select('id, title, last_message_at, created_at')
        .eq('user_id', userId!)
        .order('last_message_at', { ascending: false })
        .limit(20);

      const convList = (convData ?? []) as Conversation[];

      // Resolve which conversation to display:
      // 1. Use the given ID if it still exists in the list
      // 2. If null (new-conversation state), keep null — no messages
      let effectiveId: string | null = null;
      if (conversationId) {
        const found = convList.find((c) => c.id === conversationId);
        // If stored ID is gone (deleted/never existed), fall back to most recent
        effectiveId = found ? conversationId : (convList[0]?.id ?? null);
      }

      let messages: UIMessage[] = [];
      if (effectiveId) {
        const { data: msgData } = await supabase
          .from('chat_messages')
          .select('id, role, content, created_at')
          .eq('user_id', userId!)
          .eq('conversation_id', effectiveId)
          .order('created_at', { ascending: true })
          .limit(50);

        messages = (msgData ?? []).map((row) => ({
          id: row.id,
          role: row.role as 'user' | 'assistant',
          content: row.content,
          parts: [{ type: 'text' as const, text: row.content }],
          createdAt: new Date(row.created_at),
        }));
      }

      return { convList, messages, effectiveId };
    },
    [userId],
  );

  // On mount (or userId change): restore last active conversation from localStorage.
  // Falls back to the most recent conversation if the stored ID is gone.
  useEffect(() => {
    if (!userId) return;
    const savedId = readStoredConvId(userId);
    let active = true;

    fetchHistory(savedId).then(({ convList, messages, effectiveId }) => {
      if (!active) return;
      setConversations(convList);
      setInitialMessages(messages);
      setActiveConversationId(effectiveId);
      writeStoredConvId(userId, effectiveId);
      setHasLoaded(true);
    });

    return () => {
      active = false;
    };
  }, [fetchHistory, userId]);

  const saveMessage = useCallback(
    async (role: 'user' | 'assistant', content: string) => {
      if (!userId) return;
      const supabase = getClient();

      let convId = activeConversationId;

      // Auto-create conversation on first user message in a new session
      if (!convId && role === 'user') {
        const title = content.slice(0, 60) || 'Nova conversa';
        const { data: conv } = await supabase
          .from('conversations')
          .insert({ user_id: userId, title, last_message_at: new Date().toISOString() })
          .select('id')
          .single();
        if (conv) {
          convId = conv.id as string;
          setActiveConversationId(convId);
          writeStoredConvId(userId, convId);
          setConversations((prev) => [
            {
              id: convId!,
              title,
              last_message_at: new Date().toISOString(),
              created_at: new Date().toISOString(),
            },
            ...prev,
          ]);
        }
      }

      await supabase.from('chat_messages').insert({
        user_id: userId,
        role,
        content,
        conversation_id: convId ?? null,
      });

      // Keep last_message_at fresh for ordering in the history panel
      if (convId) {
        await supabase
          .from('conversations')
          .update({ last_message_at: new Date().toISOString() })
          .eq('id', convId);
      }
    },
    [userId, activeConversationId],
  );

  const startNewConversation = useCallback(() => {
    setActiveConversationId(null);
    setInitialMessages([]);
    if (userId) writeStoredConvId(userId, null);
  }, [userId]);

  const switchConversation = useCallback(
    (id: string) => {
      setActiveConversationId(id);
      if (userId) writeStoredConvId(userId, id);

      fetchHistory(id).then(({ convList, messages, effectiveId }) => {
        setConversations(convList);
        setInitialMessages(messages);
        setActiveConversationId(effectiveId);
        if (userId) writeStoredConvId(userId, effectiveId);
      });
    },
    [fetchHistory, userId],
  );

  return {
    initialMessages,
    historyLoading,
    conversations,
    activeConversationId,
    saveMessage,
    startNewConversation,
    switchConversation,
  };
}
