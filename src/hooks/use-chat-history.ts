'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { UIMessage } from 'ai';
import type { SupabaseClient } from '@supabase/supabase-js';

interface UseChatHistoryResult {
  initialMessages: UIMessage[];
  historyLoading: boolean;
  saveMessage: (role: 'user' | 'assistant', content: string) => Promise<void>;
}

export function useChatHistory(userId: string | null): UseChatHistoryResult {
  const [initialMessages, setInitialMessages] = useState<UIMessage[]>([]);
  const [historyLoading, setHistoryLoading] = useState(true);
  // Stable client ref — access only inside effects/callbacks, not during render
  const clientRef = useRef<SupabaseClient | null>(null);

  useEffect(() => {
    if (!clientRef.current) {
      clientRef.current = createClient();
    }
    const supabase = clientRef.current;

    async function loadHistory() {
      if (!userId) {
        setHistoryLoading(false);
        return;
      }

      const { data } = await supabase
        .from('chat_messages')
        .select('id, role, content, created_at')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(50);

      if (data) {
        // Reverse to get chronological order (oldest first)
        const messages: UIMessage[] = data.reverse().map((row) => ({
          id: row.id,
          role: row.role as 'user' | 'assistant',
          content: row.content,
          parts: [{ type: 'text' as const, text: row.content }],
          createdAt: new Date(row.created_at),
        }));
        setInitialMessages(messages);
      }

      setHistoryLoading(false);
    }

    loadHistory();
  }, [userId]);

  const saveMessage = useCallback(
    async (role: 'user' | 'assistant', content: string) => {
      if (!userId) return;
      if (!clientRef.current) {
        clientRef.current = createClient();
      }
      await clientRef.current.from('chat_messages').insert({ user_id: userId, role, content });
    },
    [userId]
  );

  return { initialMessages, historyLoading, saveMessage };
}
