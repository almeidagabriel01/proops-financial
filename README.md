# Finansim — App Financeiro Pessoal com IA

SaaS financeiro pessoal mobile-first para o Brasil. Importe extratos OFX/CSV, a IA categoriza automaticamente em PT-BR e um assistente conversacional responde perguntas sobre seus dados reais.

## Stack

| Camada | Tecnologia |
|--------|-----------|
| Frontend | Next.js 14+ App Router + TypeScript |
| Estilização | shadcn/ui + Tailwind CSS |
| Backend | Next.js API Routes + Supabase Edge Functions |
| Banco | PostgreSQL via Supabase (RLS) |
| Auth | Supabase Auth (email/senha + Google OAuth) |
| IA | Claude Haiku 4.5 (categorização) + Sonnet 4.6 (chat) |
| Pagamentos | Asaas (Pix + Boleto + Cartão) |
| Deploy | Vercel + Supabase Cloud |

## Como rodar localmente

**Pré-requisitos:** Node.js 18+, Supabase CLI, conta Supabase

```bash
# 1. Instalar dependências
npm install

# 2. Configurar variáveis de ambiente
cp .env.example .env.local
# Editar .env.local com suas chaves (Supabase, Anthropic, Asaas)

# 3. Iniciar Supabase local
supabase start
supabase db push

# 4. Gerar tipos TypeScript do banco
supabase gen types typescript --local > src/lib/supabase/types.ts

# 5. Iniciar servidor de desenvolvimento
npm run dev
# App disponível em http://localhost:3000
```

## Estrutura de pastas

```
src/
├── app/                # Páginas e API routes (Next.js App Router)
│   ├── (auth)/         # Login, signup, OAuth callback
│   ├── (app)/          # Dashboard, transações, importação, chat
│   └── api/            # Import, chat, webhook Asaas, health
├── components/         # Componentes React (shadcn/ui + domínio)
├── hooks/              # React hooks (useTransactions, useUser)
└── lib/                # Lógica de negócio (parsers, IA, billing, utils)

supabase/
├── migrations/         # Migrations SQL
└── functions/          # Edge Functions (categorize-import)

docs/
├── prd/                # Product Requirements Document
└── architecture/       # Arquitetura do sistema
```

## Comandos

```bash
npm run dev          # Servidor de desenvolvimento
npm run build        # Build de produção
npm run typecheck    # Verificar tipos TypeScript
npm run lint         # ESLint
npm test             # Vitest (testes unitários)
```

## Variáveis de ambiente

Veja `.env.example` para a lista completa. Variáveis obrigatórias para rodar:

```
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY
ANTHROPIC_API_KEY
```
