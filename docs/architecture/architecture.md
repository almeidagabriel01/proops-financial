# Architecture Document

**Produto:** App Financeiro Pessoal com IA — Brasil
**Versao:** 1.3
**Data:** 2026-04-06
**Autor:** Aria (@architect)
**Status:** Approved
**PRD Ref:** `docs/prd/prd.md` v1.4 (Approved)

---

## 1. Architecture Overview

### 1.1 System Context

```
┌─────────────────────────────────────────────────────────┐
│                      USUARIO                            │
│              (Browser mobile / Chrome / Safari)         │
└──────────────────────┬──────────────────────────────────┘
                       │ HTTPS
                       ▼
┌─────────────────────────────────────────────────────────┐
│                 VERCEL (Frontend + API)                  │
│  ┌───────────────────────────────────────────────────┐  │
│  │           Next.js App Router (SSR/RSC)            │  │
│  │  ┌─────────────┐  ┌──────────────────────────┐   │  │
│  │  │   Pages /    │  │     API Routes           │   │  │
│  │  │   Components │  │  /api/import (parsing)   │   │  │
│  │  │   (React)    │  │  /api/chat   (IA)        │   │  │
│  │  │              │  │  /api/webhook (Asaas)    │   │  │
│  │  └──────┬───────┘  └──────┬───────────────────┘   │  │
│  └─────────┼─────────────────┼───────────────────────┘  │
└────────────┼─────────────────┼──────────────────────────┘
             │                 │
             │ Supabase JS     │ Server-side
             │ Client (RLS)    │
             ▼                 ▼
┌─────────────────────────────────────────────────────────┐
│                     SUPABASE                            │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌────────┐ │
│  │PostgreSQL│  │   Auth   │  │ Storage  │  │Realtime│ │
│  │  (RLS)   │  │(JWT/OAuth│  │(OFX/CSV) │  │(future)│ │
│  └──────────┘  └──────────┘  └──────────┘  └────────┘ │
└─────────────────────────────────────────────────────────┘

┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐
│   Claude API     │  │   Whisper API    │  │     Asaas        │
│  (Anthropic)     │  │   (OpenAI)       │  │  (Pagamentos)    │
│  Haiku + Sonnet  │  │  Audio→Texto     │  │  Cartao/Boleto/  │
│  Function Call   │  │  Pro only        │  │  Pix             │
└──────────────────┘  └──────────────────┘  └──────────────────┘
```

### 1.2 Design Principles

1. **Supabase-first:** Frontend fala direto com Supabase para CRUD. API Routes apenas para logica server-only (IA, parsing, webhooks)
2. **RLS as security layer:** Row Level Security do Supabase e a camada de autorizacao primaria — cada usuario so ve seus dados
3. **Zero unnecessary layers:** Sem ORM, sem abstracoes de repositorio. Supabase client + RLS e suficiente para o MVP
4. **Server Components by default:** Renderizacao no servidor sempre que possivel, client components apenas quando necessario (interatividade)
5. **Cost-conscious:** Haiku para tarefas em batch, Sonnet apenas para chat interativo. Cache agressivo para evitar chamadas desnecessarias a IA

### 1.3 Key Architectural Decisions

| Decisao | Escolha | Alternativa Descartada | Justificativa |
|---------|---------|----------------------|---------------|
| Data access | Supabase JS Client direto | ORM (Prisma/Drizzle) | Dev solo, menos boilerplate, RLS nativo, tipagem via codegen |
| Server logic (sync) | Next.js API Routes | — | Single project, single deploy, mesmo runtime |
| Server logic (async) | Supabase Edge Function | — | Categorization needs >10s, exceeds Vercel Hobby timeout. Edge Function for async only |
| Routing | App Router | Pages Router | Server Components, streaming nativo (chat IA), layouts aninhados |
| Styling | shadcn/ui + Tailwind | Chakra/Mantine | Componentes copiados (sem dependencia), customizaveis, acessiveis |
| Auth | Supabase Auth | NextAuth/custom JWT | Ja integrado, Google OAuth pronto, session management automatico |
| File storage | Supabase Storage | S3/Vercel Blob | Ja incluso no Supabase, RLS para acesso por usuario |
| IA categorization | Claude Haiku 4.5 | GPT-4o-mini | Melhor custo-beneficio, prompt em PT-BR superior |
| IA chat Basic | Claude Haiku 4.5 | GPT-4o-mini | Consultas simples, custo otimizado, 50 msgs/mes |
| IA chat Pro | Claude Sonnet 4.6 | GPT-4o | PT-BR superior, streaming nativo, function calling nativo |
| Function Calling | Vercel AI SDK (`ai` package) | Anthropic SDK raw | Abstração streaming + tools integrada ao Next.js App Router |
| Audio transcription | Whisper API (OpenAI) | Deepgram/AssemblyAI | Melhor WER em PT-BR, custo $0.006/min, SDK simples |
| Payments | Asaas | Stripe | Brasileiro, boleto+Pix nativos, custo menor para early stage |

---

## 2. Project Structure

```
financial/
├── public/
│   ├── manifest.json          # PWA manifest
│   ├── icons/                 # App icons (PWA)
│   └── sw.js                  # Service worker (minimal, PWA)
│
├── src/
│   ├── app/                   # Next.js App Router
│   │   ├── layout.tsx         # Root layout (providers, fonts, metadata)
│   │   ├── page.tsx           # Landing / redirect to dashboard
│   │   ├── globals.css        # Tailwind base + custom properties
│   │   │
│   │   ├── (auth)/            # Auth route group (no layout nesting)
│   │   │   ├── login/
│   │   │   │   └── page.tsx
│   │   │   ├── signup/
│   │   │   │   └── page.tsx
│   │   │   └── callback/
│   │   │       └── route.ts   # OAuth callback handler
│   │   │
│   │   ├── (app)/             # Authenticated app route group
│   │   │   ├── layout.tsx     # App shell (navbar, sidebar, auth guard)
│   │   │   ├── dashboard/
│   │   │   │   └── page.tsx   # Main dashboard (Server Component)
│   │   │   ├── transactions/
│   │   │   │   └── page.tsx   # Transaction list with filters
│   │   │   ├── import/
│   │   │   │   └── page.tsx   # File upload (Client Component)
│   │   │   ├── chat/
│   │   │   │   └── page.tsx   # AI chat (Client Component, Premium)
│   │   │   └── settings/
│   │   │       └── page.tsx   # Profile, plan, preferences
│   │   │
│   │   └── api/               # API Routes (server-only logic)
│   │       ├── import/
│   │       │   └── route.ts   # POST: parse OFX/CSV, categorize, save
│   │       ├── chat/
│   │       │   └── route.ts   # POST: stream AI response (Basic: Haiku, Pro: Sonnet + tools)
│   │       ├── audio/
│   │       │   └── route.ts   # POST: audio→text via Whisper (Pro only)
│   │       ├── webhook/
│   │       │   └── asaas/
│   │       │       └── route.ts  # POST: payment events
│   │       └── health/
│   │           └── route.ts   # GET: health check
│   │
│   ├── components/            # Shared UI components
│   │   ├── ui/                # shadcn/ui components (Button, Card, Dialog, etc.)
│   │   ├── dashboard/         # Dashboard-specific components
│   │   │   ├── summary-cards.tsx
│   │   │   ├── category-chart.tsx
│   │   │   └── spending-breakdown.tsx
│   │   ├── transactions/      # Transaction-specific components
│   │   │   ├── transaction-list.tsx
│   │   │   ├── transaction-item.tsx
│   │   │   └── category-selector.tsx
│   │   ├── chat/              # Chat-specific components
│   │   │   ├── chat-messages.tsx
│   │   │   ├── chat-input.tsx
│   │   │   └── chat-bubble.tsx
│   │   ├── import/            # Import-specific components
│   │   │   ├── file-dropzone.tsx
│   │   │   └── import-progress.tsx
│   │   └── layout/            # Layout components
│   │       ├── navbar.tsx
│   │       ├── bottom-nav.tsx  # Mobile bottom navigation
│   │       └── paywall-modal.tsx
│   │
│   ├── lib/                   # Core business logic & utilities
│   │   ├── supabase/
│   │   │   ├── client.ts      # Browser Supabase client (singleton)
│   │   │   ├── server.ts      # Server Supabase client (for API routes)
│   │   │   ├── middleware.ts  # Auth middleware helper
│   │   │   └── types.ts       # Generated database types (supabase gen types)
│   │   │
│   │   ├── parsers/           # File parsing logic
│   │   │   ├── ofx-parser.ts  # OFX file parser
│   │   │   ├── csv-parser.ts  # CSV file parser (multi-bank)
│   │   │   ├── bank-formats/  # Bank-specific CSV format definitions
│   │   │   │   ├── nubank.ts
│   │   │   │   ├── itau.ts
│   │   │   │   ├── bradesco.ts
│   │   │   │   └── index.ts   # Format detector
│   │   │   └── types.ts       # ParsedTransaction interface
│   │   │
│   │   ├── ai/                # AI integration
│   │   │   ├── categorizer.ts # Batch categorization logic
│   │   │   ├── chat.ts        # Chat completion with context (Basic/Pro)
│   │   │   ├── audio.ts       # Whisper transcription (Pro only)
│   │   │   ├── tools/         # Function calling tool definitions
│   │   │   │   ├── create-transaction.ts
│   │   │   │   ├── update-transaction-category.ts
│   │   │   │   ├── delete-transaction.ts
│   │   │   │   ├── create-budget.ts
│   │   │   │   ├── create-goal.ts
│   │   │   │   └── index.ts   # Exports PRO_TOOLS array
│   │   │   ├── prompts/       # Prompt templates
│   │   │   │   ├── categorize.ts
│   │   │   │   └── chat-system.ts
│   │   │   └── cache.ts       # Categorization cache (queries category_cache table)
│   │   │
│   │   ├── billing/           # Payment integration
│   │   │   ├── asaas.ts       # Asaas API client
│   │   │   ├── plans.ts       # Plan definitions (Basic/Pro)
│   │   │   └── webhook-handler.ts  # Webhook event processing
│   │   │
│   │   └── utils/             # General utilities
│   │       ├── constants.ts   # App-wide constants
│   │       ├── format.ts      # Currency, date formatting (PT-BR)
│   │       └── rate-limit.ts  # Rate limiting utilities
│   │
│   ├── hooks/                 # Custom React hooks
│   │   ├── use-user.ts        # Current user + plan info
│   │   ├── use-transactions.ts # Transaction queries
│   │   └── use-plan.ts        # Plan gate hook (isBasic, isPro, canUseAudio, canUseTools)
│   │
│   └── middleware.ts          # Next.js middleware (auth redirect, rate limit)
│
├── supabase/
│   ├── migrations/            # SQL migrations (version controlled)
│   │   ├── 001_initial_schema.sql
│   │   ├── 002_unaccent_search.sql
│   │   └── 003_plan_restructure.sql  # basic/pro rename + audio_enabled column
│   ├── functions/             # Supabase Edge Functions (Deno)
│   │   └── categorize-import/ # Async categorization after import
│   │       └── index.ts
│   ├── seed.sql               # Development seed data
│   └── config.toml            # Supabase local config
│
├── tests/
│   ├── unit/
│   │   ├── parsers/           # Parser tests with real OFX/CSV fixtures
│   │   ├── ai/                # AI prompt tests
│   │   └── billing/           # Billing logic tests
│   ├── integration/
│   │   └── import-flow.test.ts # End-to-end import test
│   └── fixtures/              # Test files (sample OFX, CSV)
│       ├── nubank-sample.csv
│       ├── itau-sample.ofx
│       └── bradesco-sample.csv
│
├── .env.local                 # Local env vars (gitignored)
├── .env.example               # Documented env template
├── next.config.ts             # Next.js configuration
├── tailwind.config.ts         # Tailwind configuration
├── tsconfig.json              # TypeScript configuration
├── components.json            # shadcn/ui configuration
└── package.json
```

### 2.1 Rationale da Estrutura

**Route Groups `(auth)` e `(app)`:** Separacao clara entre paginas publicas (login/signup) e protegidas (dashboard, chat). O layout do grupo `(app)` inclui o auth guard e a shell do app (navbar, bottom-nav).

**`src/lib/` como core:** Toda logica de negocio reutilizavel fica aqui. Nenhuma logica de negocio em components ou pages — estes sao camada de apresentacao.

**`src/lib/supabase/`:** Dois clients separados — browser (usa cookies, funciona com RLS) e server (usa service role key, para API routes que precisam de acesso admin).

**`supabase/migrations/`:** SQL versionado, rodado pelo Supabase CLI. Sem ORM — migrations sao SQL puro.

---

## 3. Database Schema

### 3.1 Tables

```sql
-- ============================================================
-- Users: Extended profile (Supabase Auth handles the core user)
-- ============================================================
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  plan text not null default 'basic' check (plan in ('basic', 'pro')),
  trial_ends_at timestamptz default (now() + interval '7 days'),  -- trial Pro 7 dias no signup
  audio_enabled boolean not null default false,                    -- true apenas Pro/trial
  asaas_customer_id text,
  ai_queries_this_month int not null default 0,
  ai_queries_reset_at date not null default date_trunc('month', current_date)::date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ============================================================
-- Bank Accounts: Imported sources
-- ============================================================
create table public.bank_accounts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  bank_name text not null,         -- 'Nubank', 'Itau', etc.
  account_label text,              -- User-defined label
  last_import_at timestamptz,
  created_at timestamptz not null default now()
);

-- ============================================================
-- Imports: File import history
-- ============================================================
create table public.imports (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  bank_account_id uuid not null references public.bank_accounts(id) on delete cascade,
  file_name text not null,
  file_type text not null check (file_type in ('ofx', 'csv')),
  storage_path text not null,       -- Supabase Storage path
  transaction_count int not null default 0,
  duplicates_skipped int not null default 0,
  status text not null default 'processing' check (status in ('processing', 'categorizing', 'completed', 'failed')),
  error_message text,
  created_at timestamptz not null default now()
);

-- ============================================================
-- Transactions: Core financial data
-- ============================================================
create table public.transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  bank_account_id uuid not null references public.bank_accounts(id) on delete cascade,
  import_id uuid references public.imports(id) on delete set null,

  -- Transaction data (from parsing)
  external_id text not null,         -- OFX: bank's FITID; CSV: SHA-256(date+amount+normalized_description)
  date date not null,
  description text not null,        -- Raw description from bank
  amount decimal(12,2) not null,    -- Positive = credit, negative = debit
  type text not null check (type in ('credit', 'debit')),

  -- Categorization
  category text not null default 'outros',
  category_source text not null default 'pending' check (category_source in ('pending', 'ai', 'user', 'cache')),
  category_confidence decimal(3,2), -- 0.00 to 1.00

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  -- Deduplication constraint
  unique(user_id, bank_account_id, external_id)
);

-- ============================================================
-- Category Dictionary: User corrections for learning
-- ============================================================
create table public.category_dictionary (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  description_pattern text not null, -- Normalized description
  category text not null,
  usage_count int not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  unique(user_id, description_pattern)
);

-- ============================================================
-- Category Cache: Global categorization cache (cross-user)
-- ============================================================
create table public.category_cache (
  id uuid primary key default gen_random_uuid(),
  description_normalized text not null unique, -- Lowercase, trimmed, whitespace-collapsed
  category text not null,
  confidence decimal(3,2),
  hit_count int not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ============================================================
-- Chat Messages: Conversation history
-- ============================================================
create table public.chat_messages (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  role text not null check (role in ('user', 'assistant')),
  content text not null,
  created_at timestamptz not null default now()
);

-- ============================================================
-- Subscriptions: Payment tracking
-- ============================================================
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
-- Indexes
-- ============================================================
create index idx_transactions_user_date on public.transactions(user_id, date desc);
create index idx_transactions_user_category on public.transactions(user_id, category);
create index idx_transactions_user_bank on public.transactions(user_id, bank_account_id);
create index idx_category_dict_user on public.category_dictionary(user_id, description_pattern);
create index idx_chat_messages_user on public.chat_messages(user_id, created_at desc);
create index idx_category_cache_desc on public.category_cache(description_normalized);
create index idx_imports_user on public.imports(user_id, created_at desc);

-- ============================================================
-- Category enum constraint (14 categories — source of truth)
-- ============================================================
-- Applied via check constraint on all category columns.
-- To add a new category: alter constraint on all 3 tables.

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
-- Auto-update updated_at trigger (generic, applied to all tables)
-- ============================================================
create or replace function public.update_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

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

-- ============================================================
-- Sync profiles.plan from subscriptions (source of truth: subscriptions)
-- ============================================================
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

create trigger trg_sync_plan_on_subscription_change
  after insert or update of status on public.subscriptions
  for each row execute function public.sync_plan_from_subscription();

-- ============================================================
-- Description normalization function (for cache/dictionary lookups)
-- ============================================================
-- Usage: normalize_description('  UBER *TRIP  São Paulo ') → 'uber trip sao paulo'
create or replace function public.normalize_description(raw text)
returns text as $$
begin
  return regexp_replace(
    trim(lower(
      translate(raw, 'áàãâéêíóôõúüç', 'aaaaeeiooouuc')
    )),
    '[^a-z0-9 ]', '', 'g'  -- remove special chars except space
  );
end;
$$ language plpgsql immutable;
```

### 3.2 Row Level Security (RLS)

```sql
-- Enable RLS on all tables
alter table public.profiles enable row level security;
alter table public.bank_accounts enable row level security;
alter table public.imports enable row level security;
alter table public.transactions enable row level security;
alter table public.category_dictionary enable row level security;
alter table public.chat_messages enable row level security;
alter table public.subscriptions enable row level security;
alter table public.category_cache enable row level security;

-- Policy pattern: user can only access their own data
-- Applied to ALL tables uniformly

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

-- category_cache (global, read-only for authenticated users, write via service role in API routes)
create policy "Authenticated users can read category cache"
  on public.category_cache for select using (auth.role() = 'authenticated');

-- Auto-create profile on signup (trigger)
create or replace function public.handle_new_user()
returns trigger as $$
begin
  -- plan defaults to 'basic'; trial_ends_at grants Pro features for 7 days
  -- audio_enabled starts false — set to true via trial or Pro subscription
  insert into public.profiles (id, display_name, audio_enabled)
  values (new.id, new.raw_user_meta_data->>'full_name', true);
  -- audio_enabled=true during trial (trial_ends_at > now() checked server-side)
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
```

### 3.3 Supabase Storage Buckets

```sql
-- Bucket for OFX/CSV files
insert into storage.buckets (id, name, public)
values ('imports', 'imports', false);

-- RLS: users can only access their own files
create policy "Users can upload own imports"
  on storage.objects for insert
  with check (bucket_id = 'imports' and auth.uid()::text = (storage.foldername(name))[1]);

create policy "Users can read own imports"
  on storage.objects for select
  using (bucket_id = 'imports' and auth.uid()::text = (storage.foldername(name))[1]);
```

**Storage path convention:** `imports/{user_id}/{import_id}.{ext}`

---

## 4. API Routes Architecture

### 4.1 Route Map

| Route | Method | Auth | Purpose | Input | Output |
|-------|--------|------|---------|-------|--------|
| `/api/health` | GET | No | Health check | — | `{ status, supabase, timestamp }` |
| `/api/import` | POST | Yes | Parse file + save (sync) + trigger categorization (async) | `FormData (file, bank_name)` | `{ importId, count, duplicates, status: 'categorizing' }` |
| `/api/chat` | POST | Yes (Basic+Pro) | AI chat response — Haiku para Basic, Sonnet+tools para Pro | `{ message, plan? }` | `ReadableStream (SSE)` |
| `/api/audio` | POST | Yes (Pro only) | Transcrever audio via Whisper antes de enviar ao chat | `FormData (audio: Blob)` | `{ transcript: string }` |
| `/api/webhook/asaas` | POST | HMAC | Payment events | Asaas event payload | `200 OK` |

### 4.2 Import Pipeline (Two-Phase: Sync + Async)

**Why two phases:** Vercel Hobby has a 10-second timeout on serverless functions.
Parsing is fast (~1-2s), but AI categorization can take 10-30s for large extracts.
Split into sync (upload+parse) and async (categorize) to stay within limits.

**Phase 1: Sync — POST /api/import (< 10s, Vercel API Route)**

```
Client uploads file
    │
    ▼
[1] Validate auth (Supabase server client)
    │
    ▼
[2] Validate file (type, size < 5MB)
    │
    ▼
[3] Upload original to Supabase Storage
    │  path: imports/{user_id}/{import_id}.{ext}
    ▼
[4] Parse file
    │  ├── OFX → ofx-parser.ts
    │  └── CSV → csv-parser.ts (auto-detect bank format)
    │  Output: ParsedTransaction[]
    ▼
[5] Generate external_id for CSV
    │  OFX: use bank's native transaction ID (FITID)
    │  CSV: SHA-256 hash of (date + amount + normalized_description)
    ▼
[6] Deduplicate
    │  Check external_id against existing transactions
    │  Skip duplicates, count them
    ▼
[7] Insert transactions with category='outros', category_source='pending'
    │  (uncategorized — categorization happens async)
    ▼
[8] Update import record (status: 'categorizing', counts)
    │
    ▼
[9] Return summary to client: { importId, count, duplicates, status: 'categorizing' }
    │
    ▼
[10] Trigger async categorization (invoke Supabase Edge Function)
```

**Phase 2: Async — Supabase Edge Function (categorize-import)**

```
Edge Function receives { importId, userId }
    │
    ▼
[1] Load uncategorized transactions for this import
    │  WHERE import_id = $importId AND category_source = 'pending'
    ▼
[2] Categorize (batch, 3-tier)
    │  ├── Tier 1: Check user's category_dictionary
    │  ├── Tier 2: Check category_cache table
    │  └── Tier 3: Remaining → Claude Haiku batch call
    │  Output: CategorizedTransaction[]
    ▼
[3] Update transactions with categories
    │  SET category = $cat, category_source = $source, category_confidence = $conf
    ▼
[4] Update import record (status: 'completed')
    │
    ▼
[5] Supabase Realtime broadcasts change
    │  Client UI updates automatically (status: 'categorizing' → 'completed')
```

**Client-side UX:**
- After upload: show "Extrato importado! Categorizando transacoes..." with spinner
- Subscribe to Supabase Realtime on `imports` table filtered by `importId`
- When status changes to 'completed': refresh dashboard, show success
- If categorization fails: show transactions with category 'outros' + manual fix option

### 4.3 Chat Pipeline (POST /api/chat)

O endpoint `/api/chat` serve tanto Basic quanto Pro. O modelo e as capacidades diferem por plano.

```
Client sends { message }
    │
    ▼
[1] Validate auth (MANDATORY — server-side)
    │  Lookup profiles: plan, trial_ends_at, audio_enabled,
    │  ai_queries_this_month, ai_queries_reset_at
    │
    ├─ FAIL (no auth) → 401
    │
    ▼
[2] Determine effective plan
    │  isPro = plan === 'pro' OR trial_ends_at > now()
    │  isBasic = plan === 'basic' AND trial_ends_at <= now()
    │
    ▼
[3] Check rate limit (server-side)
    │  Basic: ai_queries_this_month < 50
    │  Pro:   ai_queries_this_month < 200
    │  Reset if ai_queries_reset_at < first day of current month
    │  FAIL → 429 { error: 'quota_exceeded', plan, limit, used }
    ▼
[4] Increment ai_queries_this_month
    │
    ▼
[5] Load financial context (same for both plans)
    │  ├── Last 3 months aggregated by category
    │  ├── Monthly totals (income, expenses, balance)
    │  └── Top merchants/categories
    ▼
[6] Build model config based on plan
    │  Basic: model = 'claude-haiku-4-5-20251001', tools = []
    │  Pro:   model = 'claude-sonnet-4-6',         tools = PRO_TOOLS (5 funções)
    ▼
[7] Save user message to chat_messages BEFORE AI call
    │  (persists even if stream fails)
    ▼
[8A] Basic path: stream Haiku response (text only)
    │  No tools attached → pure conversation
    │  Stream via ReadableStream / SSE
    │
[8B] Pro path: Sonnet with tool_choice='auto' (Vercel AI SDK)
    │  ├── LLM may respond with text (consulta) OR tool_call (ação)
    │  │
    │  ├── TEXT RESPONSE → stream to client (same as Basic)
    │  │
    │  └── TOOL CALL:
    │       ├── delete_transaction → send confirmation request to client
    │       │   Client must confirm → re-call with { confirmed: true }
    │       ├── Validate plan = 'pro' again (defense-in-depth)
    │       ├── Execute action server-side with service_role key
    │       ├── Return tool result to Sonnet
    │       └── Sonnet streams confirmation message to user
    ▼
[9] Save assistant message to chat_messages AFTER stream completes
    ▼
[10] Stream complete
```

**Diferenciação por plano no mesmo endpoint:**
```typescript
// src/app/api/chat/route.ts
const isPro = profile.plan === 'pro' || new Date(profile.trial_ends_at) > new Date();
const model = isPro ? 'claude-sonnet-4-6' : 'claude-haiku-4-5-20251001';
const tools = isPro ? PRO_TOOLS : [];   // PRO_TOOLS importado de lib/ai/tools/index.ts
```

### 4.4 Webhook Pipeline (POST /api/webhook/asaas)

```
Asaas sends event
    │
    ▼
[1] Verify HMAC signature
    │
    ▼
[2] Parse event type
    │  ├── PAYMENT_CONFIRMED → activate/renew subscription → plan='pro', audio_enabled=true
    │  ├── PAYMENT_OVERDUE → mark past_due, start grace period (3 days)
    │  ├── PAYMENT_DELETED → handle cancellation
    │  └── SUBSCRIPTION_DELETED → downgrade to basic, audio_enabled=false
    ▼
[3] Update subscriptions + profiles tables
    │
    ▼
[4] Return 200
```

---

## 5. AI Architecture

### 5.1 Categorization Strategy

**3-tier categorization hierarchy (eliminates unnecessary API calls):**

```
Tier 1: User Dictionary (instant, free)
  │  SELECT category FROM category_dictionary
  │  WHERE user_id = $1 AND description_pattern = normalize_description($description)
  │  Normalization: lowercase + trim + remove accents + remove special chars + collapse whitespace
  │  See: public.normalize_description() SQL function in schema
  │
  │  HIT → use category (source: 'user')
  │  MISS ▼
  │
Tier 2: Global Cache — tabela `category_cache` no Supabase (instant, free)
  │  SELECT category FROM category_cache
  │  WHERE description_normalized = normalize_description($description)
  │
  │  Tabela cross-user: qualquer usuario que importa "UBER *TRIP"
  │  popula o cache para todos os demais.
  │  Read: qualquer usuario autenticado. Write: service role (API route).
  │
  │  HIT → use category (source: 'cache')
  │  MISS ▼
  │
Tier 3: Claude Haiku API (batch, ~$0.01-0.02 per 500 transactions)
  │  Batch all remaining uncategorized transactions in one call
  │  Save results to `category_cache` table
  │  Source: 'ai', confidence: from model
```

### 5.2 Categorization Prompt Design

```typescript
// src/lib/ai/prompts/categorize.ts

const CATEGORIZE_SYSTEM = `Voce e um classificador de transacoes financeiras brasileiras.

CATEGORIAS DISPONIVEIS:
- alimentacao (supermercados, restaurantes, padarias)
- delivery (iFood, Rappi, Uber Eats, 99Food)
- transporte (Uber, 99, combustivel, estacionamento, pedagio)
- moradia (aluguel, condominio, IPTU, energia, agua, gas, internet)
- saude (farmacias, consultas, plano de saude, exames)
- educacao (escola, faculdade, cursos, livros)
- lazer (cinema, streaming, jogos, viagens, bares)
- compras (roupas, eletronicos, Mercado Livre, Amazon, Shopee)
- assinaturas (Netflix, Spotify, iCloud, gym)
- transferencias (PIX enviado, TED, DOC — entre pessoas)
- salario (salario, freelance, renda, deposito recorrente)
- investimentos (aplicacao, resgate, corretora)
- impostos (IR, IPVA, IPTU, DAS, taxas governamentais)
- outros (nao se encaixa em nenhuma acima)

REGRAS:
- Responda APENAS com JSON, sem explicacao
- Use a descricao para inferir a categoria
- Na duvida, use "outros"
- Considere o contexto brasileiro`;

const CATEGORIZE_USER = (transactions: { id: string; description: string; amount: number }[]) =>
  `Classifique estas transacoes:\n${JSON.stringify(transactions)}
  
Responda no formato: [{"id": "...", "category": "...", "confidence": 0.95}]`;
```

### 5.3 Chat System Prompt Design

```typescript
// src/lib/ai/prompts/chat-system.ts

const CHAT_SYSTEM = (context: FinancialContext) => `Voce e um assistente financeiro pessoal.

REGRAS:
- Responda SEMPRE em portugues brasileiro natural e acessivel
- Use os dados financeiros reais do usuario (fornecidos abaixo) para responder
- NUNCA invente dados ou numeros — se nao tiver a informacao, diga claramente
- Formate valores em reais (R$ 1.234,56)
- Seja conciso e direto — maximo 3 paragrafos por resposta
- Use tom amigavel mas profissional
- Quando relevante, ofereça um insight ou sugestao pratica
- NAO de conselhos de investimento especificos
- NAO mencione que voce e uma IA ou que esta usando dados importados

DADOS FINANCEIROS DO USUARIO:
${JSON.stringify(context, null, 2)}`;
```

### 5.4 Financial Context Builder

```typescript
// src/lib/ai/chat.ts

interface FinancialContext {
  current_month: {
    income: number;
    expenses: number;
    balance: number;
    by_category: { category: string; total: number; count: number }[];
    top_merchants: { description: string; total: number; count: number }[];
  };
  previous_months: {
    month: string;
    income: number;
    expenses: number;
  }[];
  total_transactions: number;
  date_range: { from: string; to: string };
}

// Query: aggregate from transactions table using Supabase
// Limit context to ~2000 tokens to keep costs low
```

### 5.5 Cost Control

| Controle | Implementacao | Camada |
|----------|--------------|--------|
| Rate limit Basic | `ai_queries_this_month < 50` (Haiku) | Supabase (tabela) |
| Rate limit Pro | `ai_queries_this_month < 200` (Sonnet) | Supabase (tabela) |
| Rate limit (tecnico) | IP-based, 60 req/min | Next.js middleware |
| Batch categorization | Todas transacoes de um extrato em 1 chamada | API Route |
| Cache de categorias | Dictionary do usuario + `category_cache` evitam chamadas repetidas | `lib/ai/cache.ts` |
| Context size limit | Agregar dados financeiros, nao enviar transacoes raw | `lib/ai/chat.ts` |
| Model selection | Haiku para batch + Basic chat; Sonnet para Pro chat | `lib/ai/` |
| Audio budget | Limite 2 minutos por mensagem de voz (~$0.012/msg) | `/api/audio` |

**Custo estimado com 1.000 usuarios (500 Basic + 500 Pro):**
- Categorizacao: ~500 importacoes/mes × $0.015 = **~US$7.50/mes**
- Chat Basic: ~300 usuarios × 20 msgs/mes × $0.001 (Haiku) = **~US$6/mes**
- Chat Pro: ~200 usuarios × 30 msgs/mes × $0.015 (Sonnet) = **~US$90/mes** *(controlado pelo limite de 200/mes)*
- Audio Pro: ~100 usuarios × 5 audios × $0.012 = **~US$6/mes**
- **Total IA: ~US$40-50/mes** (dentro do budget de US$50 ate ~800 usuarios Pro ativos)

### 5.6 Function Calling Architecture (Pro only)

O chat Pro usa o **Vercel AI SDK** com `streamText()` + `tools` para permitir que o Sonnet execute ações reais na plataforma. O LLM decide quando chamar uma função baseado na mensagem do usuário em linguagem natural.

**Tool definitions** — `src/lib/ai/tools/index.ts`:

```typescript
// Cada tool define: description (instrui o LLM quando chamar),
// parameters (Zod schema validado automaticamente pelo SDK),
// execute (chamada server-side, nunca exposta ao cliente)

export const PRO_TOOLS = {
  create_transaction: tool({
    description: 'Cria uma receita ou despesa manualmente para o usuario',
    parameters: z.object({
      date: z.string().describe('Data no formato YYYY-MM-DD'),
      description: z.string().describe('Descricao da transacao'),
      amount: z.number().describe('Valor positivo para receita, negativo para despesa'),
      category: z.enum(CATEGORIES),
    }),
    execute: async (args, { userId }) => { /* server-side insert */ }
  }),

  update_transaction_category: tool({
    description: 'Atualiza a categoria de uma transacao existente',
    parameters: z.object({
      transactionId: z.string().uuid(),
      newCategory: z.enum(CATEGORIES),
    }),
    execute: async (args, { userId }) => { /* server-side update */ }
  }),

  delete_transaction: tool({
    description: 'Exclui uma transacao — requer confirmacao do usuario',
    parameters: z.object({
      transactionId: z.string().uuid(),
      confirmed: z.boolean().describe('true somente apos confirmacao explicita do usuario'),
    }),
    execute: async (args, { userId }) => {
      if (!args.confirmed) return { requiresConfirmation: true };
      /* server-side delete */
    }
  }),

  create_budget: tool({
    description: 'Cria ou atualiza orcamento mensal para uma categoria',
    parameters: z.object({
      category: z.enum(CATEGORIES),
      monthlyLimit: z.number().positive(),
    }),
    execute: async (args, { userId }) => { /* upsert budget */ }
  }),

  create_goal: tool({
    description: 'Cria objetivo financeiro com meta e prazo',
    parameters: z.object({
      name: z.string(),
      targetAmount: z.number().positive(),
      targetDate: z.string().describe('Data alvo no formato YYYY-MM-DD'),
    }),
    execute: async (args, { userId }) => { /* insert goal */ }
  }),
};
```

**Fluxo de autorização (defense-in-depth):**

```
1. Middleware: auth check (Supabase session)
2. API route: plan === 'pro' OR trial_ends_at > now()
   └─ Basic → tools = [] (LLM nunca recebe tool definitions)
3. Tool execute(): re-verifica userId === transaction.user_id antes de modificar
4. Todas queries usam SUPABASE_SERVICE_ROLE_KEY com user_id explícito no WHERE
```

**Confirmação antes de ações destrutivas:**
- `delete_transaction` exige `confirmed: true` no parâmetro
- Se `confirmed: false` → tool retorna `{ requiresConfirmation: true }`
- Sonnet usa esse retorno para pedir confirmação ao usuário na próxima mensagem
- Usuário confirma → nova mensagem → Sonnet chama tool novamente com `confirmed: true`

---

### 5.7 Audio Input Architecture (Pro only)

**Fluxo completo áudio → resposta IA:**

```
[Browser] MediaRecorder grava áudio (webm/opus)
    │  Limite: 2 minutos (120s) — verificado no frontend antes do envio
    ▼
POST /api/audio (multipart/form-data)
    │
    ├─ [1] Validate auth + profiles.audio_enabled = true
    │       FAIL → 403 { error: 'audio_pro_only', upgradeUrl: '/settings' }
    │
    ├─ [2] Validate file: tamanho < 25MB, formato aceito (webm, mp4, wav, m4a)
    │
    ├─ [3] POST para Whisper API (OpenAI):
    │       POST https://api.openai.com/v1/audio/transcriptions
    │       model: 'whisper-1', language: 'pt', response_format: 'text'
    │
    ├─ [4] Retornar { transcript: string } ao cliente
    │
    └─ Cliente usa transcript como mensagem → POST /api/chat normalmente
```

**Especificações técnicas:**

| Item | Valor | Justificativa |
|------|-------|---------------|
| Formatos aceitos | webm, mp4, wav, m4a | Suporte nativo MediaRecorder (Chrome/Safari) |
| Limite duração | 2 minutos | Balanço UX / custo (~$0.012/msg) |
| Limite tamanho | 25 MB | Limite máximo da Whisper API |
| Modelo Whisper | `whisper-1` | Único disponível; WER < 5% em PT-BR |
| Language hint | `pt` | Reduz erros de transcrição em português |
| Rota | `/api/audio` (separada) | Evita complexidade no endpoint de chat; retorna só o texto |

**Bloqueio Basic — gate server-side correto:**
```typescript
// src/app/api/audio/route.ts
// NOTA: audio_enabled é um hint de performance (materializado no DB),
// NÃO é a fonte de verdade para autorização.
// Fonte de verdade: plan === 'pro' || trial_ends_at > now()
const inTrial = profile.trial_ends_at
  ? new Date(profile.trial_ends_at) > new Date()
  : false;
const canUseAudio = (profile.plan === 'pro' || inTrial) && profile.audio_enabled;

if (!canUseAudio) {
  return NextResponse.json(
    { error: 'audio_pro_only', message: 'Entrada por áudio disponível apenas no plano Pro' },
    { status: 403 }
  );
}
```

---

## 6. Authentication & Authorization

### 6.1 Auth Flow

```
[Signup] → Supabase Auth (email/senha ou Google)
    │
    ▼
[Trigger] → handle_new_user() cria profile com plan='basic', trial 7 dias Pro
    │
    ▼
[Login] → Supabase session (JWT no cookie httpOnly)
    │
    ▼
[Middleware] → Next.js middleware verifica session em rotas (app)/*
    │  Sem session → redirect /login
    ▼
[RLS] → Cada query filtra automaticamente por auth.uid()
```

### 6.2 Plan Verification

```typescript
// src/hooks/use-plan.ts

interface PlanCapabilities {
  isBasic: boolean;
  isPro: boolean;
  inTrial: boolean;
  canUseAudio: boolean;
  canUseFunctionCalling: boolean;
  aiModel: string;
  aiMonthlyLimit: number;
  maxBankAccounts: number;
}

function usePlan(profile: Profile): PlanCapabilities {
  const inTrial = profile.trial_ends_at
    ? new Date(profile.trial_ends_at) > new Date()
    : false;
  const isPro = profile.plan === 'pro' || inTrial;
  const isBasic = !isPro;

  return {
    isBasic,
    isPro,
    inTrial,
    canUseAudio: isPro && profile.audio_enabled,      // isPro já inclui trial; audio_enabled é hint
    canUseFunctionCalling: isPro,
    aiModel: isPro ? 'claude-sonnet-4-6' : 'claude-haiku-4-5-20251001',
    aiMonthlyLimit: isPro ? 200 : 50,
    maxBankAccounts: isPro ? Infinity : 3,
  };
}

// IMPORTANTE: este hook é APENAS para UX (mostrar paywall, desabilitar botão).
// A verificação de plano real é sempre server-side na API route.
```

**Auth Flow com plano:**
```
[Signup] → Supabase Auth → handle_new_user() cria profile:
          plan='basic', audio_enabled=true, trial_ends_at=now()+7days
          (trial Pro: audio + function calling habilitados por 7 dias)
    │
    ▼
[Trial expira] → plan='basic' permanece, audio_enabled=false
    │
    ▼
[Assina Pro] → PAYMENT_CONFIRMED webhook → plan='pro', audio_enabled=true
```

### 6.3 Middleware

```typescript
// src/middleware.ts

// 1. Auth check: redirect unauthenticated users to /login
// 2. Rate limit: IP-based protection (60 req/min for API routes)
// 3. CORS headers for API routes

export const config = {
  matcher: ['/(app)/:path*', '/api/:path*']
};
```

---

## 7. Frontend Architecture

### 7.1 Component Strategy

| Tipo | Renderizacao | Quando usar |
|------|-------------|-------------|
| Server Component | Servidor (default) | Dashboard, transaction list, layouts, data fetching |
| Client Component | Browser | Forms, chat, file upload, interactive charts, real-time UI |

### 7.2 Data Fetching Pattern

```
Server Components:
  Dashboard → supabase.from('transactions').select() (server client)
  Transactions → supabase.from('transactions').select() with filters

Client Components:
  Chat → fetch('/api/chat') with streaming
  Import → fetch('/api/import') with FormData
  Category edit → supabase.from('transactions').update() (browser client)
  Real-time → supabase.channel('transactions').on('INSERT', ...) (future)
```

### 7.3 Mobile-First Layout

```
┌─────────────────────────┐
│     Status Bar          │
├─────────────────────────┤
│  ┌─────────────────┐   │
│  │   App Header     │   │  Fixed top
│  │   (logo + menu)  │   │
│  └─────────────────┘   │
│                         │
│  ┌─────────────────┐   │
│  │                  │   │
│  │   Page Content   │   │  Scrollable
│  │   (dashboard/    │   │
│  │    transactions/ │   │
│  │    chat)         │   │
│  │                  │   │
│  └─────────────────┘   │
│                         │
├─────────────────────────┤
│  🏠  📊  ➕  💬  ⚙️    │  Fixed bottom nav
│  Home Trans Import Chat │  (mobile pattern)
│                 Settings│
└─────────────────────────┘
```

**Bottom navigation** com 5 tabs — padrao mobile que o usuario brasileiro ja conhece de Nubank, PicPay, etc. Botao central de importar ("+") com destaque visual.

### 7.4 PWA Configuration

```json
// public/manifest.json
{
  "name": "App Financeiro",
  "short_name": "Financeiro",
  "start_url": "/dashboard",
  "display": "standalone",
  "background_color": "#0F172A",
  "theme_color": "#0F172A",
  "icons": [
    { "src": "/icons/icon-192.png", "sizes": "192x192", "type": "image/png" },
    { "src": "/icons/icon-512.png", "sizes": "512x512", "type": "image/png" }
  ]
}
```

**Sem service worker real no MVP** — apenas manifest para "Add to Home Screen" com icone e splash.

---

## 8. Billing Architecture (Asaas)

### 8.1 Flow

```
[User clicks "Upgrade"] 
    → Frontend calls Asaas checkout URL (or embedded form)
    → User pays (cartao/boleto/Pix)
    → Asaas sends webhook to /api/webhook/asaas
    → Backend updates subscription + profile.plan = 'pro', audio_enabled = true
    → User refreshes → Pro features unlocked
```

### 8.2 Plan Definitions

```typescript
// src/lib/billing/plans.ts

export const CATEGORIES = [
  'alimentacao','delivery','transporte','moradia','saude','educacao',
  'lazer','compras','assinaturas','transferencias','salario',
  'investimentos','impostos','outros'
] as const;

export const PLANS = {
  basic_monthly: {
    name: 'Basic Mensal',
    price: 1990,             // R$19,90 em centavos
    asaasValue: 19.90,
    billingCycle: 'MONTHLY',
    features: {
      maxBankAccounts: 3,
      historyMonths: Infinity,
      aiChat: true,
      aiChatMonthly: 50,
      aiModel: 'claude-haiku-4-5-20251001',
      categoryComparison: true,
      audioEnabled: false,
      functionCalling: false,
    }
  },
  basic_yearly: {
    name: 'Basic Anual',
    price: 19100,            // R$191,00 (~2 meses grátis)
    asaasValue: 191.00,
    billingCycle: 'YEARLY',
    features: {
      maxBankAccounts: 3,
      historyMonths: Infinity,
      aiChat: true,
      aiChatMonthly: 50,
      aiModel: 'claude-haiku-4-5-20251001',
      categoryComparison: true,
      audioEnabled: false,
      functionCalling: false,
    }
  },
  pro_monthly: {
    name: 'Pro Mensal',
    price: 4990,             // R$49,90 em centavos
    asaasValue: 49.90,
    billingCycle: 'MONTHLY',
    features: {
      maxBankAccounts: Infinity,
      historyMonths: Infinity,
      aiChat: true,
      aiChatMonthly: 200,
      aiModel: 'claude-sonnet-4-6',
      categoryComparison: true,
      audioEnabled: true,
      functionCalling: true,
    }
  },
  pro_yearly: {
    name: 'Pro Anual',
    price: 47900,            // R$479,00 (~2 meses grátis)
    asaasValue: 479.00,
    billingCycle: 'YEARLY',
    features: {
      maxBankAccounts: Infinity,
      historyMonths: Infinity,
      aiChat: true,
      aiChatMonthly: 200,
      aiModel: 'claude-sonnet-4-6',
      categoryComparison: true,
      audioEnabled: true,
      functionCalling: true,
    }
  },
} as const;

export type PlanKey = keyof typeof PLANS;
export type PlanFeatures = typeof PLANS[PlanKey]['features'];
```

---

## 9. Security Architecture

### 9.1 Defense Layers

| Camada | Implementacao | Protege Contra |
|--------|--------------|----------------|
| **Encryption at-rest** | Supabase PostgreSQL uses AES-256 disk encryption on all paid plans. NFR4 satisfied implicitly — no column-level encryption needed for MVP | Data theft from disk |
| **Transport** | HTTPS (Vercel enforced) + TLS 1.3 | MITM, sniffing |
| **Auth** | Supabase Auth (bcrypt, JWT httpOnly cookie) | Unauthorized access |
| **Authorization** | RLS on every table | Data leakage between users |
| **Input validation** | Zod schemas on API routes | Injection, malformed data |
| **File validation** | Type + size check before parsing | Malicious uploads |
| **Rate limiting** | Middleware (IP) + DB (user plan) | Abuse, DDoS, cost explosion |
| **Webhook** | HMAC signature verification | Forged payment events |
| **Secrets** | Env vars (never client-side) | Key exposure |
| **LGPD** | Data export, account deletion, privacy policy | Legal compliance |

### 9.2 Environment Variables

```bash
# .env.example

# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...         # Public (safe for client, RLS protects)
SUPABASE_SERVICE_ROLE_KEY=eyJ...             # Secret (server-only, bypasses RLS)

# Claude API (categorização + chat)
ANTHROPIC_API_KEY=sk-ant-...                 # Secret (server-only)

# OpenAI (Whisper audio transcription — Pro only)
OPENAI_API_KEY=sk-...                        # Secret (server-only)

# Asaas
ASAAS_API_KEY=...                            # Secret (server-only)
ASAAS_WEBHOOK_SECRET=...                     # Secret (webhook HMAC)

# App
NEXT_PUBLIC_APP_URL=https://app.example.com  # Public
```

**Regra:** Apenas `NEXT_PUBLIC_*` sao expostas ao client. Todas as outras sao server-only.

---

## 10. Deployment Architecture

### 10.1 Environments

| Environment | Frontend | Backend | Database |
|-------------|----------|---------|----------|
| **Development** | `localhost:3000` | Same (API routes) | Supabase local (`supabase start`) |
| **Preview** | Vercel preview URL (per-PR) | Same | Supabase staging project |
| **Production** | Vercel production | Same | Supabase production project |

### 10.2 Deploy Pipeline

```
git push → Vercel auto-deploy
    ├── Preview: every push to non-main branch
    └── Production: push to main branch

Database migrations:
    supabase db push (manual, via Supabase CLI)
    Migrations version-controlled in supabase/migrations/
```

### 10.3 Cost Estimate

| Servico | Tier | Custo/mes | Limite |
|---------|------|-----------|--------|
| Vercel | Free (Hobby) | $0 | 100GB bandwidth, serverless functions |
| Supabase | Free | $0 | 500MB DB, 1GB storage, 50K auth users, 500K edge invocations |
| Claude API | Pay-as-you-go | ~$27.50 | Estimado para 1K users |
| Asaas | Pay-as-you-go | ~$5-10 | 1-2% por transacao |
| Dominio | Anual | ~$12/ano | .com.br |
| Sentry | Free | $0 | 5K errors/mes |
| **Total** | — | **~$35-40/mes** | Dentro do budget de $50 |

---

## 11. Extensibility: Future-Proofing

### 11.1 DataSource Abstraction (Open Finance Ready)

```typescript
// src/lib/parsers/types.ts

interface DataSource {
  type: 'file' | 'open_finance';
  fetchTransactions(params: FetchParams): Promise<ParsedTransaction[]>;
}

// MVP: FileDataSource (OFX/CSV parsing)
// Future: OpenFinanceDataSource (Pluggy/Belvo API)
// The rest of the system (categorization, storage, dashboard) doesn't change
```

### 11.2 Channel Abstraction (WhatsApp Ready)

```typescript
// Future: src/lib/channels/types.ts

interface Channel {
  type: 'web' | 'whatsapp';
  sendMessage(userId: string, message: string): Promise<void>;
  receiveMessage(payload: unknown): Promise<{ userId: string; message: string }>;
}

// MVP: Web only (no abstraction needed yet — just the Next.js app)
// Future: WhatsAppChannel wrapping WhatsApp Business API
// Chat logic (AI, context, responses) stays the same
```

**Nota:** No MVP, nao implementar estas abstracoes como codigo. Apenas manter a logica de negocio (categorizacao, chat) desacoplada do metodo de entrada (parsing de arquivo, interface web). Quando Open Finance ou WhatsApp chegarem, a separacao ja existe naturalmente.

---

## 12. Monitoring & Observability

| Ferramenta | Uso | Tier |
|------------|-----|------|
| **Sentry** | Error tracking (frontend + API routes) | Free (5K events/mes) |
| **Vercel Analytics** | Web vitals, performance | Free (basic) |
| **Supabase Dashboard** | DB metrics, auth events, storage usage | Incluso |
| **Custom `/api/health`** | Uptime check (Supabase + Claude API connectivity) | Custom |
| **`profiles.ai_queries_today`** | AI usage per user tracking | Custom (DB) |

---

## 13. Change Log

| Date | Version | Description | Author |
|------|---------|-------------|--------|
| 2026-04-05 | 1.0 | Architecture document created based on PRD v1.2 | Aria (@architect) |
| 2026-04-05 | 1.1 | Cache global de categorizacao movido de in-memory para tabela `category_cache` no Supabase. Documento aprovado. | Aria (@architect) |
| 2026-04-05 | 1.2 | QA review fixes: import pipeline split sync/async (B1), external_id NOT NULL + SHA-256 for CSV (B2), subscription→profile trigger (M2), server-side premium check (M3), updated_at triggers (M4), AES-256 documented (M5), category check constraints (M6), normalize_description() function (m4), chat message save order (m6) | Quinn (@qa) |
| 2026-04-06 | 1.3 | Atualização para PRD v1.4: (1) Planos free/premium → basic/pro com preços R$19,90/R$49,90; (2) profiles.plan CHECK renomeado, +audio_enabled column, ai_queries_today→ai_queries_this_month; (3) Migration 003_plan_restructure.sql; (4) Chat pipeline diferenciado Basic(Haiku+sem tools) vs Pro(Sonnet+function calling); (5) Seção 5.6 Function Calling com 5 tools, fluxo de validação, confirmação delete; (6) Seção 5.7 Audio Input com Whisper API, formatos, limites, custo; (7) /api/audio route; (8) ADR: +Vercel AI SDK, +Whisper; (9) plans.ts reescrito com Basic/Pro; (10) OPENAI_API_KEY nas env vars; (11) use-premium.ts → use-plan.ts | Aria (@architect) |
