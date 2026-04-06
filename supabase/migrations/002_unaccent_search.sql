-- ============================================================
-- 002_unaccent_search.sql
-- Add accent-insensitive search support for transactions
-- Ref: Story 1.4 AC3
-- ============================================================

-- Enable unaccent extension
CREATE EXTENSION IF NOT EXISTS unaccent;

-- Create IMMUTABLE wrapper (unaccent itself is STABLE, but we need IMMUTABLE for generated columns)
CREATE OR REPLACE FUNCTION public.immutable_unaccent(text)
  RETURNS text AS $$ SELECT unaccent($1) $$ LANGUAGE sql IMMUTABLE PARALLEL SAFE;

-- Add generated column: lowercase + unaccented version of description
-- Used for accent-insensitive search without overhead at query time
ALTER TABLE public.transactions
  ADD COLUMN IF NOT EXISTS description_search text
  GENERATED ALWAYS AS (lower(public.immutable_unaccent(description))) STORED;

-- Index for fast ilike queries on the normalized column
CREATE INDEX IF NOT EXISTS idx_transactions_description_search
  ON public.transactions (description_search);
