-- ============================================================
-- Migration 012: Planejamento Financeiro
-- Parcelas, Recorrentes e Transações Agendadas
-- ============================================================

-- ============================================================
-- Grupos de Parcelas (installment_groups)
-- Representa uma compra dividida em N parcelas
-- ============================================================
create table public.installment_groups (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  bank_account_id uuid not null references public.bank_accounts(id) on delete cascade,
  description text not null,
  total_amount decimal(12,2) not null check (total_amount > 0),
  installment_count int not null check (installment_count >= 2 and installment_count <= 360),
  installment_amount decimal(12,2) not null check (installment_amount > 0),
  first_date date not null,
  category text not null default 'compras',
  -- 'import' = detectado automaticamente ao importar extrato
  -- 'manual' = criado manualmente pelo usuário
  source text not null default 'manual' check (source in ('import', 'manual')),
  source_transaction_id uuid references public.transactions(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.installment_groups enable row level security;

create policy "Users can CRUD own installment_groups"
  on public.installment_groups for all
  using (auth.uid() = user_id);

create trigger trg_installment_groups_updated
  before update on public.installment_groups
  for each row execute function public.update_updated_at();

create index idx_installment_groups_user on public.installment_groups(user_id);
create index idx_installment_groups_user_date on public.installment_groups(user_id, first_date desc);

-- ============================================================
-- Regras de Recorrência (recurring_rules)
-- Define padrões de transações que se repetem
-- ============================================================
create table public.recurring_rules (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  bank_account_id uuid not null references public.bank_accounts(id) on delete cascade,
  description text not null,
  amount decimal(12,2) not null check (amount > 0),
  type text not null check (type in ('credit', 'debit')),
  category text not null default 'outros',
  frequency text not null check (frequency in ('weekly', 'biweekly', 'monthly', 'annual')),
  start_date date not null,
  end_date date,
  next_due_date date not null,
  status text not null default 'active' check (status in ('active', 'paused', 'canceled')),
  -- 'auto_detected' = identificado pelo algoritmo de detecção
  -- 'manual' = criado manualmente pelo usuário
  source text not null default 'manual' check (source in ('auto_detected', 'manual')),
  auto_detect_confidence decimal(3,2),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.recurring_rules enable row level security;

create policy "Users can CRUD own recurring_rules"
  on public.recurring_rules for all
  using (auth.uid() = user_id);

create trigger trg_recurring_rules_updated
  before update on public.recurring_rules
  for each row execute function public.update_updated_at();

create index idx_recurring_rules_user_status on public.recurring_rules(user_id, status);
create index idx_recurring_rules_next_due on public.recurring_rules(user_id, next_due_date)
  where status = 'active';

-- ============================================================
-- Transações Agendadas (scheduled_transactions)
-- Contas a pagar/receber + parcelas futuras + instâncias de recorrentes
-- ============================================================
create table public.scheduled_transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  bank_account_id uuid not null references public.bank_accounts(id) on delete cascade,
  description text not null,
  amount decimal(12,2) not null check (amount > 0),
  type text not null check (type in ('credit', 'debit')),
  category text not null default 'outros',
  due_date date not null,
  status text not null default 'pending' check (status in ('pending', 'paid', 'overdue', 'canceled')),
  -- Origem do agendamento (podem ser nulos para agendamentos avulsos)
  recurring_rule_id uuid references public.recurring_rules(id) on delete set null,
  installment_group_id uuid references public.installment_groups(id) on delete cascade,
  installment_number int,
  -- Quando pago, link para a transação real gerada
  paid_transaction_id uuid references public.transactions(id) on delete set null,
  paid_at timestamptz,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.scheduled_transactions enable row level security;

create policy "Users can CRUD own scheduled_transactions"
  on public.scheduled_transactions for all
  using (auth.uid() = user_id);

create trigger trg_scheduled_transactions_updated
  before update on public.scheduled_transactions
  for each row execute function public.update_updated_at();

create index idx_scheduled_user_due on public.scheduled_transactions(user_id, due_date, status);
create index idx_scheduled_pending on public.scheduled_transactions(user_id, status)
  where status in ('pending', 'overdue');
create index idx_scheduled_installment on public.scheduled_transactions(installment_group_id)
  where installment_group_id is not null;
create index idx_scheduled_recurring on public.scheduled_transactions(recurring_rule_id)
  where recurring_rule_id is not null;

-- ============================================================
-- Colunas extras em transactions
-- Backward-compatible: todas nullable
-- ============================================================
alter table public.transactions
  add column if not exists installment_group_id uuid
    references public.installment_groups(id) on delete set null,
  add column if not exists installment_number int,
  add column if not exists recurring_rule_id uuid
    references public.recurring_rules(id) on delete set null;

create index if not exists idx_transactions_installment
  on public.transactions(installment_group_id)
  where installment_group_id is not null;

create index if not exists idx_transactions_recurring
  on public.transactions(recurring_rule_id)
  where recurring_rule_id is not null;
