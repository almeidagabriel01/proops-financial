# Finansim — App Financeiro Pessoal com IA

SaaS financeiro pessoal mobile-first para o Brasil. Importe extratos OFX/CSV, a IA categoriza automaticamente em PT-BR e um assistente conversacional responde perguntas sobre seus dados reais.

## Stack

| Camada | Tecnologia |
|--------|-----------|
| Frontend | Next.js 16+ App Router + TypeScript |
| Estilização | shadcn/ui + Tailwind CSS (mobile-first) |
| Backend | Next.js API Routes + Supabase Edge Functions |
| Banco | PostgreSQL via Supabase (RLS) |
| Auth | Supabase Auth (email/senha + Google OAuth) |
| IA | Claude Haiku 4.5 (categorização batch) + Sonnet 4.6 (chat) |
| Pagamentos | Asaas (Pix + Boleto + Cartão) |
| Deploy | Vercel + Supabase Cloud |

---

## Pré-requisitos

- **Node.js 20+**
- **npm 10+**
- Conta [Supabase](https://supabase.com) (plano gratuito funciona)
- Conta [Anthropic](https://console.anthropic.com) para a API Claude
- **Docker NÃO é necessário** — Supabase Cloud direto

---

## Setup local

```bash
# 1. Clonar e instalar dependências
git clone <repo-url>
cd proops-financial
npm install

# 2. Configurar variáveis de ambiente
cp .env.example .env.local
# Abrir .env.local e preencher com suas chaves (ver seção abaixo)

# 3. Aplicar migrations no Supabase Cloud
npx supabase link --project-ref <seu-project-ref>
npx supabase db push

# 4. Gerar tipos TypeScript do banco
npx supabase gen types typescript --project-id <seu-project-ref> > src/lib/supabase/types.ts

# 5. Iniciar servidor de desenvolvimento
npm run dev
# App disponível em http://localhost:3000
```

---

## Variáveis de ambiente

Copie `.env.example` para `.env.local` e preencha:

```bash
# Supabase (obrigatório)
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJh...
SUPABASE_SERVICE_ROLE_KEY=eyJh...   # nunca expor no cliente

# Claude API (obrigatório para IA)
ANTHROPIC_API_KEY=sk-ant-...

# Asaas (necessário apenas para pagamentos)
ASAAS_API_KEY=...
ASAAS_WEBHOOK_TOKEN=...

# Sentry (opcional — monitoramento de erros)
NEXT_PUBLIC_SENTRY_DSN=https://...
SENTRY_DSN=https://...
SENTRY_ORG=...
SENTRY_PROJECT=...
SENTRY_AUTH_TOKEN=...   # necessário para source maps (project:releases, org:read)
```

---

## Comandos de desenvolvimento

```bash
npm run dev              # Servidor local (Turbopack)
npm run build            # Build de produção
npm run start            # Servir build de produção localmente
npm run typecheck        # Verificar tipos TypeScript
npm run lint             # ESLint
npm run lint:fix         # ESLint com auto-fix

# Testes
npm test                 # Vitest — testes unitários
npm run test:watch       # Vitest em modo watch
npm run test:coverage    # Cobertura de código (mínimo 80% em src/lib/)
npm run test:integration # Testes de integração (requer TEST_SUPABASE_* vars)
npm run test:e2e         # Playwright E2E (requer app rodando em localhost:3000)

# Quality gate completo (lint + build + testes)
npm run quality          # lint + build + unit tests
npm run quality:full     # lint + build + tests + coverage

# Performance
npm run lighthouse       # Lighthouse CI (requer npm run start primeiro)
```

---

## Rodar E2E localmente

Os testes E2E usam um projeto Supabase de staging dedicado (sem Docker):

```bash
# 1. Criar arquivo .env.test.local com credenciais de staging
cat > .env.test.local << EOF
TEST_SUPABASE_URL=https://xxx-staging.supabase.co
TEST_SUPABASE_ANON_KEY=eyJh...
TEST_SUPABASE_SERVICE_ROLE_KEY=eyJh...
EOF

# 2. Iniciar o app em modo produção com variáveis de staging
NEXT_PUBLIC_SUPABASE_URL=<staging-url> \
NEXT_PUBLIC_SUPABASE_ANON_KEY=<staging-anon> \
npm run build && npm run start &

# 3. Instalar browsers do Playwright (primeira vez)
npx playwright install --with-deps chromium

# 4. Criar usuário de teste e rodar E2E
E2E_USER_EMAIL=e2e-local@test.finansim.app \
E2E_USER_PASSWORD=Test@1234! \
TEST_SUPABASE_URL=<staging-url> \
TEST_SUPABASE_SERVICE_ROLE_KEY=<staging-service-key> \
npm run test:e2e
```

---

## Estrutura do projeto

```
src/
├── app/                # Páginas e API routes (Next.js App Router)
│   ├── (auth)/         # Login, signup, OAuth callback
│   ├── (app)/          # Dashboard, transações, importação, chat
│   ├── api/            # Import, chat, webhook Asaas, health
│   └── offline/        # Página de fallback offline (PWA)
├── components/         # Componentes React (shadcn/ui + domínio)
│   ├── dashboard/      # Cards, gráficos, breakdown
│   ├── transactions/   # Lista, item, formulário
│   ├── chat/           # Mensagens, input, áudio
│   ├── import/         # Dropzone, progress
│   └── layout/         # Bottom nav, banners, paywall
├── hooks/              # React hooks
└── lib/                # Lógica de negócio (parsers, IA, billing, utils)

supabase/
├── migrations/         # Migrations SQL (aplicar com supabase db push)
└── functions/          # Edge Functions (categorize-import)

tests/
├── unit/               # Testes unitários (Vitest)
├── integration/        # Testes de integração com Supabase staging
├── e2e/                # Playwright E2E
└── fixtures/           # Arquivos OFX/CSV reais para testes

docs/
├── prd/                # Product Requirements Document
├── architecture/       # Arquitetura do sistema
└── stories/            # Development stories por Epic
```

---

## Deploy na Vercel

### Primeira vez

```bash
# 1. Instalar Vercel CLI
npm i -g vercel

# 2. Fazer deploy
vercel --prod

# 3. Configurar variáveis de ambiente no Vercel Dashboard
# Project Settings → Environment Variables
# Adicionar todas as vars de .env.example marcadas como Required
```

### Variáveis obrigatórias na Vercel

| Variável | Onde obter |
|----------|-----------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase Dashboard → Settings → API |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase Dashboard → Settings → API |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase Dashboard → Settings → API |
| `ANTHROPIC_API_KEY` | console.anthropic.com |
| `ASAAS_API_KEY` | app.asaas.com → Configurações → API |
| `ASAAS_WEBHOOK_TOKEN` | Gerar token aleatório (openssl rand -hex 32) |

### Rollback

Em caso de problema em produção, reverter para commit anterior:

```bash
# Via Vercel CLI
vercel rollback

# Via Vercel Dashboard
# Deployments → selecionar deploy anterior → "Promote to Production"
```

---

## GitHub Actions (CI/CD)

O workflow `.github/workflows/ci.yml` executa automaticamente em todo push/PR:

| Job | Trigger | O que faz |
|-----|---------|-----------|
| `quality` | Todo push (main/dev) e PR | lint + typecheck + build + unit tests + coverage |
| `e2e` | PR para main e push em main | Playwright contra staging Supabase |

### Secrets necessários no GitHub Actions

Configure em: Settings → Secrets and Variables → Actions

| Secret | Para qual job |
|--------|-------------|
| `NEXT_PUBLIC_SUPABASE_URL` | quality (build) |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | quality (build) |
| `TEST_SUPABASE_URL` | e2e |
| `TEST_SUPABASE_ANON_KEY` | e2e |
| `TEST_SUPABASE_SERVICE_ROLE_KEY` | e2e (criar/deletar usuários de teste) |
| `ANTHROPIC_API_KEY` | e2e (chat com IA real) |

### Branch protection

Para ativar proteção em `main` (bloqueia merges com CI falhando):
Settings → Branches → Add rule → Branch name: `main` → Require status checks: `quality`

---

## Categorias suportadas

14 categorias fixas em PT-BR:

`alimentacao` · `delivery` · `transporte` · `moradia` · `saude` · `educacao` · `lazer` · `compras` · `assinaturas` · `transferencias` · `salario` · `investimentos` · `impostos` · `outros`

---

## Bancos suportados no MVP

| Banco | Formato | Como exportar |
|-------|---------|--------------|
| Nubank | CSV | App → Perfil → Exportar fatura |
| Itaú | OFX | Internet banking → Extrato → Exportar OFX |
| Bradesco | CSV | Internet banking → Extrato → Exportar CSV |
| Qualquer banco | OFX | Qualquer software de finanças pessoais exporta OFX |
