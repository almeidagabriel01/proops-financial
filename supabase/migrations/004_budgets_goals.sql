-- ============================================================
-- Migration 004: Budgets and Goals tables
-- Required by function calling tools (Pro plan, Epic 3)
-- ============================================================

-- ============================================================
-- Budgets: orcamento mensal por categoria (Pro only via chat)
-- ============================================================
create table public.budgets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  category text not null check (category in (
    'alimentacao', 'delivery', 'transporte', 'moradia',
    'saude', 'educacao', 'lazer', 'compras', 'assinaturas',
    'transferencias', 'salario', 'investimentos',
    'impostos', 'outros'
  )),
  monthly_limit decimal(12,2) not null check (monthly_limit > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  -- Um orcamento por categoria por usuario
  unique(user_id, category)
);

alter table public.budgets enable row level security;

create policy "Users can CRUD own budgets"
  on public.budgets for all
  using (auth.uid() = user_id);

create trigger update_budgets_updated_at
  before update on public.budgets
  for each row execute function public.update_updated_at();

create index idx_budgets_user on public.budgets(user_id);

-- ============================================================
-- Goals: objetivos financeiros com meta e prazo
-- ============================================================
create table public.goals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  name text not null,
  target_amount decimal(12,2) not null check (target_amount > 0),
  current_amount decimal(12,2) not null default 0
    check (current_amount >= 0),
  deadline date not null,
  status text not null default 'active'
    check (status in ('active', 'completed', 'canceled')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.goals enable row level security;

create policy "Users can CRUD own goals"
  on public.goals for all
  using (auth.uid() = user_id);

create trigger update_goals_updated_at
  before update on public.goals
  for each row execute function public.update_updated_at();

create index idx_goals_user on public.goals(user_id, status);
