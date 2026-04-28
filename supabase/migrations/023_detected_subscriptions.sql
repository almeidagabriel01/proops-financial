-- Migration: 023_detected_subscriptions
-- Automatic subscription detection from transaction history.
-- Subscriptions are detected algorithmically — not manually created by users.

-- ── Table ──────────────────────────────────────────────────────────────────────

CREATE TABLE public.detected_subscriptions (
  id                      uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                 uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  description_normalized  text        NOT NULL,
  display_name            text        NOT NULL,
  current_amount          numeric(10,2) NOT NULL,
  previous_amount         numeric(10,2),
  frequency               text        NOT NULL CHECK (frequency IN ('monthly', 'annual')),
  last_occurrence_date    date        NOT NULL,
  occurrence_count        integer     NOT NULL DEFAULT 2,
  price_change_detected   boolean     NOT NULL DEFAULT false,
  price_change_alerted_at timestamptz,
  dismissed_at            timestamptz,
  created_at              timestamptz NOT NULL DEFAULT now(),
  updated_at              timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, description_normalized)
);

-- ── RLS ────────────────────────────────────────────────────────────────────────

ALTER TABLE public.detected_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "detected_subscriptions_user_isolation"
  ON public.detected_subscriptions
  FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- ── Indexes ────────────────────────────────────────────────────────────────────

CREATE INDEX idx_detected_subscriptions_user
  ON public.detected_subscriptions (user_id, dismissed_at, price_change_detected DESC, current_amount DESC);

-- ── Auto-updated_at trigger ───────────────────────────────────────────────────

CREATE TRIGGER update_detected_subscriptions_updated_at
  BEFORE UPDATE ON public.detected_subscriptions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
