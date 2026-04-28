-- Adiciona política UPDATE em push_subscriptions.
-- Necessário para que o upsert (INSERT ON CONFLICT DO UPDATE)
-- no endpoint /api/push/subscribe funcione corretamente via RLS:
-- o PostgreSQL verifica UPDATE RLS separadamente do INSERT no path ON CONFLICT.

CREATE POLICY "push_subscriptions_update_own"
  ON public.push_subscriptions
  FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());
