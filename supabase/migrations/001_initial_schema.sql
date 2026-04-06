-- ============================================================
-- 001_initial_schema.sql
-- Full database schema for App Financeiro Pessoal com IA
-- Ref: docs/architecture/architecture.md v1.2 — Section 3
-- ============================================================

-- ============================================================
-- Functions (created first — triggers reference them)
-- ============================================================

-- Auto-update updated_at trigger function
create or replace function public.update_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

-- Sync profiles.plan from subscriptions
create or replace function public.sync_plan_from_subscription()
returns trigger as $$
begin
  if new.status = 'active' then
    update public.profiles set plan = 'premium' where id = new.user_id;
  elsif new.status in ('canceled', 'expired') then
    update public.profiles set plan = 'free' where id = new.user_id;
  end if;
  return new;
end;
$$ language plpgsql security definer;

-- Description normalization for cache/dictionary lookups
create or replace function public.normalize_description(raw text)
returns text as $$
begin
  return regexp_replace(
    trim(lower(
      translate(raw, 'áàãâéêíóôõúüç', 'aaaaeeiooouuc')
    )),
    '[^a-z0-9 ]', '', 'g'
  );
end;
$$ language plpgsql immutable;

-- Auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, new.raw_user_meta_data->>'full_name');
  return new;
end;
$$ language plpgsql security definer;

-- ============================================================
-- Tables
-- ============================================================

-- Users: Extended profile (Supabase Auth handles the core user)
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  plan text not null default 'free' check (plan in ('free', 'premium')),
  trial_ends_at timestamptz default (now() + interval '7 days'),
  asaas_customer_id text,
  ai_queries_today int not null default 0,
  ai_queries_reset_at date not null default current_date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Bank Accounts: Imported sources
create table public.bank_accounts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  bank_name text not null,
  account_label text,
  last_import_at timestamptz,
  created_at timestamptz not null default now()
);

-- Imports: File import history
create table public.imports (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  bank_account_id uuid not null references public.bank_accounts(id) on delete cascade,
  file_name text not null,
  file_type text not null check (file_type in ('ofx', 'csv')),
  storage_path text not null,
  transaction_count int not null default 0,
  duplicates_skipped int not null default 0,
  status text not null default 'processing' check (status in ('processing', 'categorizing', 'completed', 'failed')),
  error_message text,
  created_at timestamptz not null default now()
);

-- Transactions: Core financial data
create table public.transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  bank_account_id uuid not null references public.bank_accounts(id) on delete cascade,
  import_id uuid references public.imports(id) on delete set null,
  external_id text not null,
  date date not null,
  description text not null,
  amount decimal(12,2) not null,
  type text not null check (type in ('credit', 'debit')),
  category text not null default 'outros',
  category_source text not null default 'pending' check (category_source in ('pending', 'ai', 'user', 'cache')),
  category_confidence decimal(3,2),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(user_id, bank_account_id, external_id)
);

-- Category Dictionary: User corrections for learning
create table public.category_dictionary (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  description_pattern text not null,
  category text not null,
  usage_count int not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(user_id, description_pattern)
);

-- Category Cache: Global categorization cache (cross-user)
create table public.category_cache (
  id uuid primary key default gen_random_uuid(),
  description_normalized text not null unique,
  category text not null,
  confidence decimal(3,2),
  hit_count int not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Chat Messages: Conversation history
create table public.chat_messages (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  role text not null check (role in ('user', 'assistant')),
  content text not null,
  created_at timestamptz not null default now()
);

-- Subscriptions: Payment tracking
create table public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  asaas_subscription_id text unique,
  plan text not null check (plan in ('monthly', 'yearly')),
  status text not null default 'active' check (status in ('active', 'past_due', 'canceled', 'expired')),
  current_period_start timestamptz,
  current_period_end timestamptz,
  cancel_at_period_end boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ============================================================
-- Indexes (7 indexes)
-- ============================================================

create index idx_transactions_user_date on public.transactions(user_id, date desc);
create index idx_transactions_user_category on public.transactions(user_id, category);
create index idx_transactions_user_bank on public.transactions(user_id, bank_account_id);
create index idx_category_dict_user on public.category_dictionary(user_id, description_pattern);
create index idx_chat_messages_user on public.chat_messages(user_id, created_at desc);
create index idx_category_cache_desc on public.category_cache(description_normalized);
create index idx_imports_user on public.imports(user_id, created_at desc);

-- ============================================================
-- Category enum constraints (14 categories — applied to 3 tables)
-- ============================================================

alter table public.transactions
  add constraint chk_transactions_category
  check (category in (
    'alimentacao','delivery','transporte','moradia','saude','educacao',
    'lazer','compras','assinaturas','transferencias','salario',
    'investimentos','impostos','outros'
  ));

alter table public.category_dictionary
  add constraint chk_dict_category
  check (category in (
    'alimentacao','delivery','transporte','moradia','saude','educacao',
    'lazer','compras','assinaturas','transferencias','salario',
    'investimentos','impostos','outros'
  ));

alter table public.category_cache
  add constraint chk_cache_category
  check (category in (
    'alimentacao','delivery','transporte','moradia','saude','educacao',
    'lazer','compras','assinaturas','transferencias','salario',
    'investimentos','impostos','outros'
  ));

-- ============================================================
-- Triggers
-- ============================================================

-- 5x updated_at triggers
create trigger trg_profiles_updated_at before update on public.profiles
  for each row execute function public.update_updated_at();
create trigger trg_transactions_updated_at before update on public.transactions
  for each row execute function public.update_updated_at();
create trigger trg_category_dictionary_updated_at before update on public.category_dictionary
  for each row execute function public.update_updated_at();
create trigger trg_category_cache_updated_at before update on public.category_cache
  for each row execute function public.update_updated_at();
create trigger trg_subscriptions_updated_at before update on public.subscriptions
  for each row execute function public.update_updated_at();

-- Sync plan from subscription changes
create trigger trg_sync_plan_on_subscription_change
  after insert or update of status on public.subscriptions
  for each row execute function public.sync_plan_from_subscription();

-- Auto-create profile on auth signup
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ============================================================
-- Row Level Security (RLS)
-- ============================================================

alter table public.profiles enable row level security;
alter table public.bank_accounts enable row level security;
alter table public.imports enable row level security;
alter table public.transactions enable row level security;
alter table public.category_dictionary enable row level security;
alter table public.chat_messages enable row level security;
alter table public.subscriptions enable row level security;
alter table public.category_cache enable row level security;

-- profiles
create policy "Users can view own profile"
  on public.profiles for select using (auth.uid() = id);
create policy "Users can update own profile"
  on public.profiles for update using (auth.uid() = id);

-- bank_accounts
create policy "Users can CRUD own bank accounts"
  on public.bank_accounts for all using (auth.uid() = user_id);

-- imports
create policy "Users can CRUD own imports"
  on public.imports for all using (auth.uid() = user_id);

-- transactions
create policy "Users can CRUD own transactions"
  on public.transactions for all using (auth.uid() = user_id);

-- category_dictionary
create policy "Users can CRUD own dictionary"
  on public.category_dictionary for all using (auth.uid() = user_id);

-- chat_messages
create policy "Users can CRUD own messages"
  on public.chat_messages for all using (auth.uid() = user_id);

-- subscriptions
create policy "Users can view own subscriptions"
  on public.subscriptions for select using (auth.uid() = user_id);

-- category_cache (global read for authenticated, write via service role)
create policy "Authenticated users can read category cache"
  on public.category_cache for select using (auth.role() = 'authenticated');

-- ============================================================
-- Storage bucket for OFX/CSV imports
-- ============================================================

insert into storage.buckets (id, name, public)
values ('imports', 'imports', false);

create policy "Users can upload own imports"
  on storage.objects for insert
  with check (bucket_id = 'imports' and auth.uid()::text = (storage.foldername(name))[1]);

create policy "Users can read own imports"
  on storage.objects for select
  using (bucket_id = 'imports' and auth.uid()::text = (storage.foldername(name))[1]);
