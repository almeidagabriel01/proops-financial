-- ============================================================
-- Migration 011: Custom Categories
-- Removes fixed category CHECK constraints to allow user-defined categories
-- The 14 predefined categories remain as suggestions in the application layer.
-- ============================================================

-- Drop category constraints from transactions
ALTER TABLE public.transactions
  DROP CONSTRAINT IF EXISTS chk_transactions_category;

-- Drop category constraints from category_dictionary
ALTER TABLE public.category_dictionary
  DROP CONSTRAINT IF EXISTS chk_dict_category;

-- Drop category constraints from category_cache
ALTER TABLE public.category_cache
  DROP CONSTRAINT IF EXISTS chk_cache_category;

-- Add a length constraint to prevent abuse (max 50 chars)
ALTER TABLE public.transactions
  ADD CONSTRAINT chk_transactions_category_length
  CHECK (char_length(category) >= 1 AND char_length(category) <= 50);

ALTER TABLE public.category_dictionary
  ADD CONSTRAINT chk_dict_category_length
  CHECK (char_length(category) >= 1 AND char_length(category) <= 50);

ALTER TABLE public.category_cache
  ADD CONSTRAINT chk_cache_category_length
  CHECK (char_length(category) >= 1 AND char_length(category) <= 50);
