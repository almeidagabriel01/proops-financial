-- Migration: 015_transaction_tags
-- Adds transaction_tags table for user-defined tags on transactions

CREATE TABLE transaction_tags (
  id             uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  transaction_id uuid NOT NULL REFERENCES transactions(id) ON DELETE CASCADE,
  user_id        uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  tag            text NOT NULL CHECK (char_length(tag) BETWEEN 1 AND 50),
  created_at     timestamptz DEFAULT now(),
  CONSTRAINT transaction_tags_unique UNIQUE(transaction_id, tag)
);

CREATE INDEX idx_transaction_tags_user_id ON transaction_tags(user_id);
CREATE INDEX idx_transaction_tags_transaction_id ON transaction_tags(transaction_id);
CREATE INDEX idx_transaction_tags_user_tag ON transaction_tags(user_id, tag);

ALTER TABLE transaction_tags ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own tags"
  ON transaction_tags FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());
