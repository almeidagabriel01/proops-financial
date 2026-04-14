-- Migration 019: Push Subscriptions (C1.3)
-- Tabela para armazenar subscriptions de Web Push por usuário.
-- Cada dispositivo/browser tem um endpoint único por usuário.

CREATE TABLE push_subscriptions (
  id         uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id    uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  endpoint   text NOT NULL,
  keys       jsonb NOT NULL,  -- { p256dh: string, auth: string }
  created_at timestamptz DEFAULT now(),
  CONSTRAINT push_subscriptions_unique UNIQUE(user_id, endpoint)
);

-- Índice para buscar subscriptions por usuário ao enviar push (AC6 /api/push/send)
CREATE INDEX push_subscriptions_user_id_idx ON push_subscriptions(user_id);

-- RLS obrigatório — usuário só acessa suas próprias subscriptions
ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "push_subscriptions_select_own"
  ON push_subscriptions FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "push_subscriptions_insert_own"
  ON push_subscriptions FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "push_subscriptions_delete_own"
  ON push_subscriptions FOR DELETE
  USING (user_id = auth.uid());
