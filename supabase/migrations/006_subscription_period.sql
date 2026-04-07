-- ============================================================
-- Migration 006: Subscription billing period dates
-- Populated by webhook PAYMENT_CONFIRMED events
-- ============================================================

alter table public.subscriptions
  add column if not exists current_period_start date,
  add column if not exists current_period_end   date;
