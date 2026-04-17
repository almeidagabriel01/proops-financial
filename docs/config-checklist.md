# Checklist de Configuração — Produção

**Data:** 17 de abril de 2026  
**Diagnóstico:** leitura de `.env.local`, `.env.example`, `vercel.json`, código-fonte, `supabase secrets list`, `supabase migration list`, `supabase functions list`

---

## Resumo Executivo

| Categoria | Status |
|-----------|--------|
| Supabase (banco + auth) | ✅ OK |
| Google AI (chat + categorização) | ✅ OK |
| Groq (transcrição áudio) | ✅ OK |
| Edge Functions | ✅ Deployadas e ACTIVE |
| Migrations | ✅ 001–025 aplicadas (prod) |
| **Stripe (billing)** | ❌ **NÃO CONFIGURADO** |
| **Push Notifications (VAPID)** | ❌ **NÃO CONFIGURADO** |
| **Vercel Crons (CRON_SECRET)** | ❌ **NÃO CONFIGURADO** |
| **Resend (email relatórios)** | ❌ **NÃO CONFIGURADO** |
| Sentry (monitoramento) | ❌ Não configurado (opcional MVP) |
| ANTHROPIC_API_KEY (legado) | ⚠️ Configurado com valor vazio |

---

## 1. `.env.local` — Variáveis Presentes

| Variável | Valor Preenchido? | Impacto se Ausente |
|----------|-------------------|--------------------|
| `NEXT_PUBLIC_SUPABASE_URL` | ✅ Sim | App inteiro quebra |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | ✅ Sim | App inteiro quebra |
| `SUPABASE_SERVICE_ROLE_KEY` | ✅ Sim | API routes server-side quebram |
| `GOOGLE_AI_API_KEY` | ✅ Sim | Chat e categorização quebram |
| `GROQ_API_KEY` | ✅ Sim | Transcrição de áudio quebra |
| `NEXT_PUBLIC_APP_URL` | ✅ Sim | Links relativos quebram |
| `ASAAS_API_KEY` | ✅ Sim (⚠️ legado) | Asaas substituído por Stripe |
| `ASAAS_WEBHOOK_SECRET` | ✅ Sim (⚠️ legado) | Asaas substituído por Stripe |
| `STRIPE_SECRET_KEY` | ❌ Não | Checkout e webhook Stripe quebram |
| `STRIPE_WEBHOOK_SECRET` | ❌ Não | Webhook Stripe retorna 401 |
| `STRIPE_BASIC_MONTHLY_PRICE_ID` | ❌ Não | Checkout retorna 500 |
| `STRIPE_BASIC_ANNUAL_PRICE_ID` | ❌ Não | Checkout retorna 500 |
| `STRIPE_PRO_MONTHLY_PRICE_ID` | ❌ Não | Checkout retorna 500 |
| `STRIPE_PRO_ANNUAL_PRICE_ID` | ❌ Não | Checkout retorna 500 |
| `NEXT_PUBLIC_VAPID_PUBLIC_KEY` | ❌ Não | Push notifications não registram |
| `VAPID_PRIVATE_KEY` | ❌ Não | `sendPushNotification` lança erro |
| `VAPID_SUBJECT` | ❌ Não | `sendPushNotification` lança erro |
| `CRON_SECRET` | ❌ Não | Crons retornam 401 (budgets + reports) |
| `RESEND_API_KEY` | ❌ Não | Relatório mensal por email não envia |
| `NEXT_PUBLIC_SENTRY_DSN` | ❌ Não | Erros client-side não monitorados |
| `SENTRY_DSN` | ❌ Não | Erros server-side não monitorados |
| `SENTRY_ORG` | ❌ Não | Source maps não enviados no build |
| `SENTRY_PROJECT` | ❌ Não | Source maps não enviados no build |
| `SENTRY_AUTH_TOKEN` | ❌ Não | Source maps não enviados no build |

> ⚠️ **Atenção:** `ASAAS_API_KEY` e `ASAAS_WEBHOOK_SECRET` são variáveis legadas — o gateway de pagamento foi migrado para Stripe. Podem ser removidas com segurança do `.env.local`.

> ⚠️ **Atenção:** `NEXT_PUBLIC_SITE_URL` é referenciada em `src/app/api/reports/monthly/cron/route.ts` como fallback para links de email, mas não está no `.env.local` nem no `.env.example`. O código usa `NEXT_PUBLIC_APP_URL` como alias, mas a variável canônica no código é `NEXT_PUBLIC_SITE_URL`. Adicionar ao `.env.local` e ao `.env.example`.

---

## 2. `.env.example` — Completude

| Status | Detalhe |
|--------|---------|
| ✅ Supabase | Completo (URL, anon key, service role) |
| ✅ Google AI | Completo |
| ✅ Stripe | Completo (secret, publishable, webhook, 4 price IDs) |
| ✅ Groq | Completo |
| ✅ Sentry | Completo (DSN client/server, org, project, auth_token) |
| ✅ VAPID | Completo (public, private, subject) |
| ✅ CRON_SECRET | Presente |
| ✅ Resend | Presente |
| ✅ E2E test vars | Presentes (staging Supabase + usuário) |
| ❌ `NEXT_PUBLIC_SITE_URL` | **Ausente** — usado em `reports/monthly/cron/route.ts` para gerar links de email |
| ❌ `ASAAS_API_KEY` / `ASAAS_WEBHOOK_SECRET` | Presentes no `.env.local` mas removidas do `.env.example` — consistente com migração para Stripe |
| ⚠️ `STRIPE_PUBLISHABLE_KEY` | No `.env.example` mas não usado em nenhum `process.env.STRIPE_PUBLISHABLE_KEY` no código atual |

**Ação requerida:** Adicionar `NEXT_PUBLIC_SITE_URL` ao `.env.example`.

---

## 3. Vercel Dashboard — Variáveis Necessárias em Produção

Todas as variáveis do `.env.local` que NÃO são `NEXT_PUBLIC_` precisam estar configuradas no Vercel Dashboard como Environment Variables (não expostas ao cliente).

| Variável | Precisa no Vercel? | Status Estimado |
|----------|-------------------|-----------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Sim | 🔧 Verificar no Vercel Dashboard |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Sim | 🔧 Verificar |
| `SUPABASE_SERVICE_ROLE_KEY` | Sim | 🔧 Verificar |
| `GOOGLE_AI_API_KEY` | Sim | 🔧 Verificar |
| `GROQ_API_KEY` | Sim | 🔧 Verificar |
| `STRIPE_SECRET_KEY` | Sim | ❌ Não configurado (ausente no .env.local) |
| `STRIPE_WEBHOOK_SECRET` | Sim | ❌ Não configurado |
| `STRIPE_*_PRICE_ID` (4 vars) | Sim | ❌ Não configurados |
| `CRON_SECRET` | Sim | ❌ Não configurado |
| `RESEND_API_KEY` | Sim | ❌ Não configurado |
| `VAPID_PRIVATE_KEY` | Sim | ❌ Não configurado |
| `VAPID_SUBJECT` | Sim | ❌ Não configurado |
| `NEXT_PUBLIC_VAPID_PUBLIC_KEY` | Sim | ❌ Não configurado |
| `SENTRY_AUTH_TOKEN` | Sim (build) | ❌ Não configurado |
| `SENTRY_ORG` | Sim (build) | ❌ Não configurado |
| `SENTRY_PROJECT` | Sim (build) | ❌ Não configurado |
| `NEXT_PUBLIC_SENTRY_DSN` | Sim | ❌ Não configurado |
| `SENTRY_DSN` | Sim | ❌ Não configurado |
| `NEXT_PUBLIC_APP_URL` | Sim | 🔧 Verificar |
| `NEXT_PUBLIC_SITE_URL` | Sim | ❌ Não configurado (e ausente do .env.example) |

> Verificação impossível via CLI sem `vercel env ls` autenticado. Verificar manualmente em `vercel.com/dashboard/[projeto]/settings/environment-variables`.

---

## 4. Supabase Secrets (Edge Functions)

Resultado de `supabase secrets list`:

| Secret | Status | Observação |
|--------|--------|------------|
| `SUPABASE_URL` | ✅ Configurado | |
| `SUPABASE_ANON_KEY` | ✅ Configurado | |
| `SUPABASE_SERVICE_ROLE_KEY` | ✅ Configurado | |
| `SUPABASE_DB_URL` | ✅ Configurado | |
| `GOOGLE_AI_API_KEY` | ✅ Configurado | Categorização via Edge Function |
| `NEXT_PUBLIC_APP_URL` | ✅ Configurado | |
| `ANTHROPIC_API_KEY` | ⚠️ Configurado mas vazio | Digest = SHA-256("") — legado da implementação Claude. Pode ser removido. |

**Secrets ausentes:**
| Secret | Impacto |
|--------|---------|
| `GROQ_API_KEY` | Transcrição de áudio é feita via Next.js API Route (não Edge Function) — OK |
| `RESEND_API_KEY` | Envio de email é feito via Next.js API Route — não precisa no Supabase |
| `CRON_SECRET` | Crons são gerenciados pelo Vercel — não precisa no Supabase |

> As Edge Functions deployadas (`categorize-import`, `check-budget-alerts`) usam apenas SUPABASE_* e GOOGLE_AI_API_KEY. Os secrets ausentes NÃO impactam as Edge Functions.

---

## 5. Stripe — Diagnóstico Completo

| Item | Status | Ação Necessária |
|------|--------|-----------------|
| `STRIPE_SECRET_KEY` no `.env.local` | ❌ Ausente | Criar conta Stripe, obter em dashboard.stripe.com/apikeys |
| `STRIPE_PUBLISHABLE_KEY` | ❌ Ausente no `.env.local` | Necessário apenas para Stripe.js client-side (não usado no código atual) |
| `STRIPE_WEBHOOK_SECRET` | ❌ Ausente | Criar webhook em dashboard.stripe.com/webhooks → endpoint: `https://app.finansim.com.br/api/webhook/stripe` |
| `STRIPE_BASIC_MONTHLY_PRICE_ID` | ❌ Ausente | Criar produto "Basic" + preço R$19,90/mês no Dashboard |
| `STRIPE_BASIC_ANNUAL_PRICE_ID` | ❌ Ausente | Criar preço anual |
| `STRIPE_PRO_MONTHLY_PRICE_ID` | ❌ Ausente | Criar produto "Pro" + preço R$49,90/mês |
| `STRIPE_PRO_ANNUAL_PRICE_ID` | ❌ Ausente | Criar preço anual |
| Produtos criados no Stripe Dashboard | 🔧 Não verificável via código | Criar manualmente |
| Webhook endpoint registrado | 🔧 Não verificável via código | Registrar após deploy em produção |

**Impacto:** Checkout retorna 500, `/api/webhook/stripe` retorna 401. **Billing inteiramente inoperante.**

---

## 6. Google AI — Diagnóstico

| Item | Status | Observação |
|------|--------|------------|
| `GOOGLE_AI_API_KEY` no `.env.local` | ✅ Configurado | |
| `GOOGLE_AI_API_KEY` no Supabase secrets | ✅ Configurado | Para `categorize-import` Edge Function |
| Chat IA (Gemini 2.0 Flash / 2.5 Flash) | ✅ Funcional | |
| Categorização via Edge Function | ✅ Funcional | `categorize-import` ACTIVE |

---

## 7. Groq — Diagnóstico

| Item | Status | Observação |
|------|--------|------------|
| `GROQ_API_KEY` no `.env.local` | ✅ Configurado | |
| Transcrição de áudio (`/api/audio`) | ✅ Funcional | |
| Modo stub quando chave ausente | ✅ Graceful degradation | Log: `[audio] stub mode` |

---

## 8. Sentry — Diagnóstico

| Item | Status | Observação |
|------|--------|------------|
| `NEXT_PUBLIC_SENTRY_DSN` | ❌ Não configurado | |
| `SENTRY_DSN` | ❌ Não configurado | |
| `SENTRY_ORG` | ❌ Não configurado | |
| `SENTRY_PROJECT` | ❌ Não configurado | |
| `SENTRY_AUTH_TOKEN` | ❌ Não configurado | Source maps não enviados nos builds |
| `enabled: process.env.NODE_ENV === 'production'` | ✅ Configurado | Só ativo em produção |

**Impacto:** Erros em produção não rastreados. Source maps de produção ilegíveis. Não bloqueia funcionalidades do produto.

---

## 9. PWA Push Notifications — Diagnóstico

| Item | Status | Observação |
|------|--------|------------|
| `NEXT_PUBLIC_VAPID_PUBLIC_KEY` | ❌ Não configurado | Registro de subscription no browser falha |
| `VAPID_PRIVATE_KEY` | ❌ Não configurado | `sendPushNotification` lança `Push não configurado` |
| `VAPID_SUBJECT` | ❌ Não configurado | Idem |
| Push notifications funcionam? | ❌ Não | Falha silenciosa no `PushPermissionBanner` |

🔧 **Ação:** Gerar chaves com `npx web-push generate-vapid-keys` e adicionar ao `.env.local` e Vercel Dashboard.

---

## 10. Resend (Email) — Diagnóstico

| Item | Status | Observação |
|------|--------|------------|
| `RESEND_API_KEY` | ❌ Não configurado | |
| Domínio verificado | 🔧 Não verificável via código | Verificar em resend.com/domains |
| Remetente: `relatorio@finansim.com.br` | 🔧 Requer domínio verificado | SPF + DKIM para `finansim.com.br` |
| Relatório mensal por email | ❌ Não funciona | `sendMonthlyReportEmail` lança erro da API |

---

## 11. Vercel Crons — Diagnóstico

| Item | Status | Observação |
|------|--------|------------|
| `vercel.json` configurado | ✅ Sim | 2 crons definidos |
| `/api/cron/check-budgets` | ✅ Configurado | Schedule: `0 8 * * *` (8h diário) |
| `/api/reports/monthly/cron` | ✅ Configurado | Schedule: `0 9 1 * *` (9h dia 1 do mês) |
| `CRON_SECRET` no `.env.local` | ❌ Não configurado | Crons retornam 401 |
| `CRON_SECRET` no Vercel Dashboard | ❌ Estimado não configurado | Sem o secret, Vercel não autentica |

> **Nota:** O path correto do segundo cron é `/api/reports/monthly/cron` (GET). O usuário mencionou `/api/cron/monthly-report` — esse path NÃO existe. O path real é `/api/reports/monthly/cron`.

---

## 12. Google OAuth — Diagnóstico

| Item | Status | Observação |
|------|--------|------------|
| Supabase Auth → Google provider | 🔧 Não verificável via código | Verificar em Supabase Dashboard → Authentication → Providers |
| Google Cloud Console — projeto | 🔧 Não verificável via código | Verificar em console.cloud.google.com |
| Client ID + Secret no Supabase Auth | 🔧 Não verificável via código | Configurar manualmente |
| Callback URL no Google Console | 🔧 Requer ação | `https://[supabase-project].supabase.co/auth/v1/callback` |
| Login com Google funciona? | 🔧 Não testado | Depende da config no Supabase Dashboard |

---

## 13. Supabase — Diagnóstico Completo

### Migrations

| Migrations | Status |
|-----------|--------|
| 001–025 (exceto 016, 017) | ✅ Aplicadas local E remoto |
| 016, 017 | ✅ Ausentes propositalmente (renomeadas/mescladas) |

### Edge Functions

| Função | Status | Versão | Atualizado |
|--------|--------|--------|------------|
| `categorize-import` | ✅ ACTIVE | v11 | 14 Apr 2026 |
| `check-budget-alerts` | ✅ ACTIVE | v2 | 14 Apr 2026 |

### Storage Buckets

| Bucket | Status | Observação |
|--------|--------|------------|
| `imports` | 🔧 Não verificável via CLI | Verificar em Supabase Dashboard → Storage |
| `reports` | 🔧 Não verificável via CLI | Necessário para PDFs de relatórios mensais |

### Realtime

| Tabela | Status |
|--------|--------|
| `imports` (realtime para status de importação) | 🔧 Verificar em Supabase Dashboard → Database → Replication |

---

## Ações Prioritárias

### 🔴 Crítico (bloqueia funcionalidades core)

1. **Configurar Stripe completo** — criar conta, produtos, preços, webhook endpoint. Adicionar 7 vars ao `.env.local` e Vercel Dashboard.

2. **Configurar `CRON_SECRET`** — gerar com `openssl rand -base64 32`. Adicionar ao `.env.local` e Vercel Dashboard. Sem isso os alertas de orçamento e relatórios mensais automáticos não funcionam.

3. **Configurar `RESEND_API_KEY`** — criar conta Resend, verificar domínio `finansim.com.br` (SPF + DKIM), obter API key. Adicionar ao `.env.local` e Vercel Dashboard.

### 🟡 Importante (funcionalidades Ciclo 2)

4. **Configurar VAPID keys** — `npx web-push generate-vapid-keys`. Adicionar `NEXT_PUBLIC_VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT` ao `.env.local` e Vercel Dashboard.

5. **Remover Asaas legado** — `ASAAS_API_KEY` e `ASAAS_WEBHOOK_SECRET` não são mais usados. Remover do `.env.local`.

### 🟢 Opcional (monitoramento)

6. **Configurar Sentry** — criar projeto no sentry.io, obter DSN, auth token. Adicionar 5 vars ao `.env.local` e Vercel Dashboard.

### 🔧 Manutenção do `.env.example`

7. **Adicionar `NEXT_PUBLIC_SITE_URL`** ao `.env.example` — variável usada em `reports/monthly/cron/route.ts` para gerar links de email. Atualmente não documentada.

8. **Remover `ASAAS_API_KEY`/`ASAAS_WEBHOOK_SECRET`** do `.env.example` — ou adicionar comentário indicando deprecação.

---

## Variáveis Órfãs e Legado

| Variável | Situação |
|----------|----------|
| `ASAAS_API_KEY` (`.env.local`) | Legado — Asaas substituído por Stripe |
| `ASAAS_WEBHOOK_SECRET` (`.env.local`) | Legado — idem |
| `ANTHROPIC_API_KEY` (Supabase secrets) | Legado vazio — IA migrada para Google. Remover com `supabase secrets unset ANTHROPIC_API_KEY` |
| `STRIPE_PUBLISHABLE_KEY` (`.env.example`) | No exemplo mas não usado no código atual. Manter para uso futuro com Stripe.js client-side |
