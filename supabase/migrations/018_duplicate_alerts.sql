-- Migration: 018_duplicate_alerts
-- Adds duplicate_alerts table for detecting possible duplicate charges

CREATE TABLE duplicate_alerts (
  id               uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id          uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  transaction_id_1 uuid NOT NULL REFERENCES transactions(id) ON DELETE CASCADE,
  transaction_id_2 uuid NOT NULL REFERENCES transactions(id) ON DELETE CASCADE,
  status           text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'dismissed')),
  created_at       timestamptz DEFAULT now(),
  CONSTRAINT duplicate_alerts_unique UNIQUE(transaction_id_1, transaction_id_2),
  -- Enforce ordering to prevent (B,A) when (A,B) already exists
  CONSTRAINT duplicate_alerts_ordered CHECK (transaction_id_1 < transaction_id_2)
);

CREATE INDEX idx_duplicate_alerts_user_status ON duplicate_alerts(user_id, status);

ALTER TABLE duplicate_alerts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own duplicate alerts"
  ON duplicate_alerts FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());
