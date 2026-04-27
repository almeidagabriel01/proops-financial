-- ============================================================
-- Migration 027: Stripe state canonicalization
-- Adiciona subscription_status em profiles (espelha status exato do Stripe),
-- expande constraint de subscriptions.status para incluir 'trialing'/'pending',
-- corrige trigger sync_plan_from_subscription para tratar 'trialing' separadamente,
-- e adiciona trigger de proteção contra privilege escalation via RLS.
-- ============================================================

-- 1. Adicionar subscription_status em profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS subscription_status text;

ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_subscription_status_check
  CHECK (
    subscription_status IN ('trialing', 'active', 'past_due', 'canceled', 'expired', 'pending')
    OR subscription_status IS NULL
  );

-- 2. Expandir constraint de subscriptions.status para incluir 'trialing' e 'pending'
--    (remove constraint existente, seja nomeada ou inline)
DO $$
DECLARE
  con_name text;
BEGIN
  SELECT conname INTO con_name
  FROM pg_constraint
  WHERE conrelid = 'public.subscriptions'::regclass
    AND contype = 'c'
    AND pg_get_constraintdef(oid) LIKE '%status%'
  LIMIT 1;

  IF con_name IS NOT NULL THEN
    EXECUTE 'ALTER TABLE public.subscriptions DROP CONSTRAINT ' || quote_ident(con_name);
  END IF;
END $$;

ALTER TABLE public.subscriptions
  ADD CONSTRAINT subscriptions_status_check
  CHECK (status IN ('active', 'trialing', 'past_due', 'canceled', 'expired', 'pending'));

-- 3. Backfill subscription_status a partir dos dados existentes
UPDATE public.profiles
SET subscription_status = CASE
  WHEN trial_ends_at IS NOT NULL AND trial_ends_at > now() THEN 'trialing'
  WHEN plan = 'pro' AND (trial_ends_at IS NULL OR trial_ends_at <= now()) THEN 'active'
  ELSE NULL
END;

-- 4. Trigger de proteção contra privilege escalation
--    Impede que usuários autenticados via JWT alterem campos críticos de billing
--    diretamente pelo cliente. Service role bypassa RLS e não é afetado.
CREATE OR REPLACE FUNCTION public.prevent_profile_privilege_escalation()
RETURNS trigger AS $$
BEGIN
  IF current_setting('request.jwt.claim.role', true) IN ('authenticated', 'anon') THEN
    NEW.plan              := OLD.plan;
    NEW.trial_ends_at     := OLD.trial_ends_at;
    NEW.stripe_customer_id := OLD.stripe_customer_id;
    NEW.subscription_status := OLD.subscription_status;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_prevent_profile_privilege_escalation ON public.profiles;
CREATE TRIGGER trg_prevent_profile_privilege_escalation
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_profile_privilege_escalation();

-- 5. Atualizar sync_plan_from_subscription para tratar 'trialing' como status distinto
--    e sincronizar subscription_status em profiles
CREATE OR REPLACE FUNCTION public.sync_plan_from_subscription()
RETURNS trigger AS $$
BEGIN
  IF new.status = 'trialing' THEN
    UPDATE public.profiles
    SET plan = 'pro', audio_enabled = true, subscription_status = 'trialing'
    WHERE id = new.user_id;

  ELSIF new.status = 'active' THEN
    UPDATE public.profiles
    SET plan = 'pro', audio_enabled = true, subscription_status = 'active'
    WHERE id = new.user_id;

  ELSIF new.status IN ('canceled', 'expired') THEN
    UPDATE public.profiles
    SET plan = 'basic', audio_enabled = false, subscription_status = new.status
    WHERE id = new.user_id;

  ELSIF new.status = 'past_due' THEN
    -- Mantém pro durante o grace period; apenas atualiza status
    UPDATE public.profiles
    SET subscription_status = 'past_due'
    WHERE id = new.user_id;

  ELSE
    UPDATE public.profiles
    SET subscription_status = new.status
    WHERE id = new.user_id;
  END IF;

  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
