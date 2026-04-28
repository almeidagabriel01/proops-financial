-- Migration: 022_categorization_rules
-- Adds explicit user-defined categorization rules (Tier 0 — runs before AI, cache, and user dictionary).
-- Rules are checked in priority DESC order; first match wins.

-- ── Table ──────────────────────────────────────────────────────────────────────

CREATE TABLE public.categorization_rules (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  pattern     text        NOT NULL CHECK (char_length(pattern) >= 2),
  match_type  text        NOT NULL DEFAULT 'contains'
                          CHECK (match_type IN ('contains', 'exact', 'starts_with')),
  category    text        NOT NULL,
  priority    integer     NOT NULL DEFAULT 0,
  active      boolean     NOT NULL DEFAULT true,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

-- ── RLS ────────────────────────────────────────────────────────────────────────

ALTER TABLE public.categorization_rules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "categorization_rules_user_isolation"
  ON public.categorization_rules
  FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- ── Indexes ────────────────────────────────────────────────────────────────────

-- Used by Tier 0 lookup in categorize-import Edge Function
CREATE INDEX idx_categorization_rules_lookup
  ON public.categorization_rules (user_id, active, priority DESC);

-- ── Auto-updated_at trigger ───────────────────────────────────────────────────

CREATE TRIGGER update_categorization_rules_updated_at
  BEFORE UPDATE ON public.categorization_rules
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ── Extend category_source constraint to include 'rule' ───────────────────────
-- Tier 0 results are stored with category_source = 'rule'.
-- We must drop the old CHECK and recreate it with 'rule' included.

ALTER TABLE public.transactions
  DROP CONSTRAINT IF EXISTS transactions_category_source_check;

ALTER TABLE public.transactions
  ADD CONSTRAINT transactions_category_source_check
  CHECK (category_source IN ('pending', 'ai', 'user', 'cache', 'rule'));
