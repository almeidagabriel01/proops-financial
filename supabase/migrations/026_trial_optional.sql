-- ============================================================
-- Migration 026: Trial opt-in (remove default automático)
-- Novos usuários não ganham trial gratuito automaticamente.
-- Trial real é gerenciado via Stripe (trial_period_days).
-- Usuários existentes com trial_ends_at preservam o valor.
-- ============================================================

-- 1. Remove DEFAULT da coluna trial_ends_at
--    Novos signups: campo fica NULL até Stripe confirmar trial ativo
ALTER TABLE public.profiles
  ALTER COLUMN trial_ends_at DROP DEFAULT;

-- 2. Recriar handle_new_user sem depender do default de trial_ends_at
--    audio_enabled segue sendo true; será corrigido se user não converter
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, display_name, audio_enabled)
  VALUES (new.id, new.raw_user_meta_data->>'full_name', false);
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Índice para performance do grace period check no paywall
CREATE INDEX IF NOT EXISTS idx_subscriptions_user_status_updated
  ON public.subscriptions (user_id, status, updated_at DESC);
