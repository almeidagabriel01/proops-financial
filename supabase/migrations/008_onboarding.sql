-- Migration 008: Add onboarding_completed to profiles
-- Existing users get DEFAULT false — handled by banner in dashboard (no forced redirect)

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS onboarding_completed boolean NOT NULL DEFAULT false;
