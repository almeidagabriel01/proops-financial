-- ============================================================
-- Migration 013: Replace Asaas with Stripe
-- Rename customer/subscription ID columns, update billing_cycle values
-- ============================================================

-- 1. Rename asaas_customer_id → stripe_customer_id in profiles
alter table public.profiles
  rename column asaas_customer_id to stripe_customer_id;

alter table public.profiles
  drop constraint if exists profiles_asaas_customer_id_unique;

alter table public.profiles
  add constraint profiles_stripe_customer_id_unique unique (stripe_customer_id);

-- 2. Rename asaas_subscription_id → stripe_subscription_id in subscriptions
alter table public.subscriptions
  rename column asaas_subscription_id to stripe_subscription_id;

alter table public.subscriptions
  drop constraint if exists subscriptions_asaas_subscription_id_key;

alter table public.subscriptions
  add constraint subscriptions_stripe_subscription_id_unique unique (stripe_subscription_id);

-- 3. Migrate billing_cycle values: 'yearly' → 'annual'
update public.subscriptions
  set billing_cycle = 'annual'
  where billing_cycle = 'yearly';

-- 4. Update billing_cycle check constraint to use 'annual' (was 'yearly')
alter table public.subscriptions
  drop constraint if exists subscriptions_plan_check;

alter table public.subscriptions
  add constraint subscriptions_billing_cycle_check
  check (billing_cycle in ('monthly', 'annual'));
