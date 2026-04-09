-- ============================================================
-- Migration 010: Chat Conversations
-- Adds conversation grouping to chat_messages
-- ============================================================

create table public.conversations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  title text,
  last_message_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

alter table public.conversations enable row level security;

create policy "Users can CRUD own conversations"
  on public.conversations for all using (auth.uid() = user_id);

-- Add conversation_id to chat_messages (nullable for backward compat)
alter table public.chat_messages
  add column conversation_id uuid references public.conversations(id) on delete cascade;

create index idx_conversations_user on public.conversations(user_id, last_message_at desc);
create index idx_chat_messages_conversation on public.chat_messages(conversation_id, created_at asc);
