-- ============================================================
-- Migration 005: Asaas Customer ID — add UNIQUE constraint
-- asaas_customer_id already exists (migration 001) — add uniqueness
-- ============================================================

-- Add unique constraint so each user maps to exactly one Asaas customer
alter table public.profiles
  add constraint profiles_asaas_customer_id_unique unique (asaas_customer_id);

-- Add 'pending' status for subscriptions created before payment is confirmed
-- (checkout creates subscription immediately; webhook confirms later)
alter table public.subscriptions
  drop constraint if exists subscriptions_status_check;

alter table public.subscriptions
  add constraint subscriptions_status_check
  check (status in ('active', 'past_due', 'canceled', 'expired', 'pending'));
