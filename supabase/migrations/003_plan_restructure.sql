-- ============================================================
-- Migration 003: Plan Restructure (free/premium → basic/pro)
-- PRD v1.4 — Basic (R$19,90) e Pro (R$49,90)
-- ============================================================

-- 1. Drop old plan check constraint
alter table public.profiles
  drop constraint if exists profiles_plan_check;

-- 2. Add audio_enabled column
alter table public.profiles
  add column if not exists audio_enabled boolean not null default false;

-- 3. Rename ai_queries_today → ai_queries_this_month and change reset logic
alter table public.profiles
  rename column ai_queries_today to ai_queries_this_month;

-- Reset date now tracks month boundary (first day of month)
alter table public.profiles
  alter column ai_queries_reset_at
  set default date_trunc('month', current_date)::date;

-- 4. Migrate existing plan values
update public.profiles set plan = 'basic' where plan = 'free';
update public.profiles set plan = 'pro'   where plan = 'premium';

-- 5. Set audio_enabled=true for existing pro users
update public.profiles set audio_enabled = true where plan = 'pro';

-- 6. Set audio_enabled=true for users still in trial
update public.profiles
  set audio_enabled = true
  where trial_ends_at > now() and audio_enabled = false;

-- 7. Add new plan check constraint
alter table public.profiles
  add constraint profiles_plan_check
  check (plan in ('basic', 'pro'));

-- 8. Update sync_plan_from_subscription trigger function
create or replace function public.sync_plan_from_subscription()
returns trigger as $$
begin
  if new.status = 'active' then
    update public.profiles
    set plan = 'pro', audio_enabled = true
    where id = new.user_id;
  elsif new.status in ('canceled', 'expired') then
    update public.profiles
    set plan = 'basic', audio_enabled = false
    where id = new.user_id;
  end if;
  -- 'past_due' keeps pro during grace period (3 days handled by webhook)
  return new;
end;
$$ language plpgsql security definer;

-- 9. Update handle_new_user to enable audio during trial
create or replace function public.handle_new_user()
returns trigger as $$
begin
  -- plan defaults to 'basic' (column default); trial_ends_at gives Pro for 7 days
  -- audio_enabled=true during trial — set to false on trial expiry via downgrade flow
  insert into public.profiles (id, display_name, audio_enabled)
  values (new.id, new.raw_user_meta_data->>'full_name', true);
  return new;
end;
$$ language plpgsql security definer;

-- 10. Rename subscriptions.plan → billing_cycle
-- (evita confusão com profiles.plan — semânticas diferentes)
alter table public.subscriptions
  rename column plan to billing_cycle;
