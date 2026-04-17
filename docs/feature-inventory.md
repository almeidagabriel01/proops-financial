# Finansim — Inventário Completo de Features

**Data:** Abril 2026 — pós Ciclo 2 (C2.1–C2.5)
**Analista:** Atlas (@analyst)
**Metodologia:** Varredura direta do código-fonte — pages, API routes, components, hooks, lib, migrations SQL, vercel.json.
**Status:** ✅ Implementado e funcional | 🔶 Parcial / disponível via chat | ⬜ Não existe no codebase

---

## Contagens Totais

| Item | Quantidade |
|------|-----------|
| Páginas | 23 |
| API routes (arquivos route.ts/route.tsx) | 47 |
| Tabelas no banco | 23 |
| Edge Functions (Supabase Deno) | 2 |
| Vercel Crons | 2 |
| Arquivos de teste | 39 |
| Componentes (`src/components/`) | 82 |
| Migrations SQL | 24 (001–025, sem 016/017) |

---

## Páginas e Rotas

### Páginas públicas
| Rota | Arquivo | Descrição |
|------|---------|-----------|
| `/` | `src/app/page.tsx` | Redirect → /dashboard (autenticado) ou landing page (anônimo) |
| `/(auth)/login` | `src/app/(auth)/login/page.tsx` | Login email + Google OAuth |
| `/(auth)/signup` | `src/app/(auth)/signup/page.tsx` | Cadastro |
| `/(auth)/callback` | `src/app/(auth)/callback/route.ts` | Callback OAuth Supabase |
| `/(public)/privacy` | `src/app/(public)/privacy/page.tsx` | Política de privacidade (LGPD) |
| `/(public)/terms` | `src/app/(public)/terms/page.tsx` | Termos de uso |
| `/offline` | `src/app/offline/page.tsx` | Página offline (PWA fallback) |
| `/onboarding` | `src/app/onboarding/page.tsx` | Wizard de onboarding (3 steps) |

### Páginas autenticadas — app
| Rota | Arquivo | Descrição |
|------|---------|-----------|
| `/(app)/dashboard` | `src/app/(app)/dashboard/page.tsx` | Dashboard principal (Server Component) |
| `/(app)/transactions` | `src/app/(app)/transactions/page.tsx` | Lista de transações com filtros + banner IRPF |
| `/(app)/import` | `src/app/(app)/import/page.tsx` | Upload OFX/CSV com wizard |
| `/(app)/chat` | `src/app/(app)/chat/page.tsx` | Chat IA Premium |
| `/(app)/settings` | `src/app/(app)/settings/page.tsx` | Configurações (3 tabs: Perfil, Plano, Dados) |
| `/(app)/financeiro` | `src/app/(app)/financeiro/page.tsx` | Hub Financeiro (redirect/sub-nav) |
| `/(app)/financeiro/contas` | `src/app/(app)/financeiro/contas/page.tsx` | Contas a pagar/receber agendadas |
| `/(app)/financeiro/fluxo` | `src/app/(app)/financeiro/fluxo/page.tsx` | Projeção de fluxo de caixa |
| `/(app)/financeiro/parcelas` | `src/app/(app)/financeiro/parcelas/page.tsx` | Compras parceladas detectadas |
| `/(app)/financeiro/recorrentes` | `src/app/(app)/financeiro/recorrentes/page.tsx` | Recorrentes manuais + assinaturas detectadas (C2.2) |
| `/(app)/more` | `src/app/(app)/more/page.tsx` | Hub "Mais" (7 entradas: Chat, Orçamentos, Objetivos, Regras, IRPF, Import, Config) |
| `/(app)/more/objetivos` | `src/app/(app)/more/objetivos/page.tsx` | Metas financeiras |
| `/(app)/more/orcamentos` | `src/app/(app)/more/orcamentos/page.tsx` | Orçamentos mensais por categoria |
| `/(app)/more/regras` | `src/app/(app)/more/regras/page.tsx` | Regras de categorização (C2.1) |
| `/(app)/more/irpf` | `src/app/(app)/more/irpf/page.tsx` | Relatório IRPF — dedutíveis (C2.5) |

---

## API Routes — Inventário Completo

### Core
| Método | Endpoint | Funcionalidade |
|--------|----------|----------------|
| GET | `/api/health` | Status de dependências (Supabase, Anthropic, Asaas) |

### Transações
| Método | Endpoint | Funcionalidade |
|--------|----------|----------------|
| GET/POST | `/api/transactions` | Listar (com filtros) e criar transação manual |
| PATCH/DELETE | `/api/transactions/[id]` | Editar ou deletar transação |
| GET/POST | `/api/transactions/[id]/tags` | Listar e adicionar tags à transação |
| DELETE | `/api/transactions/[id]/tags/[tag]` | Remover tag específica |
| GET | `/api/tags/autocomplete` | Sugestões de tags por prefix `?q=` |

### Import e Categorização
| Método | Endpoint | Funcionalidade |
|--------|----------|----------------|
| POST | `/api/import` | Parse OFX/CSV + categorização IA + save |
| GET/POST | `/api/categorization-rules` | Listar e criar regras de categorização (C2.1) |
| PATCH/DELETE | `/api/categorization-rules/[id]` | Editar ou deletar regra (C2.1) |

### Duplicatas
| Método | Endpoint | Funcionalidade |
|--------|----------|----------------|
| GET/POST | `/api/duplicate-alerts` | Listar e criar alertas de duplicata |
| PATCH | `/api/duplicate-alerts/[id]` | Dispensar alerta de duplicata |

### Chat IA
| Método | Endpoint | Funcionalidade |
|--------|----------|----------------|
| POST | `/api/chat` | Streaming chat IA (AI SDK streamText) |
| POST | `/api/audio` | Transcrição de áudio — Pro only |

### Financeiro
| Método | Endpoint | Funcionalidade |
|--------|----------|----------------|
| GET/POST | `/api/budgets` | Listar e criar orçamentos mensais |
| PATCH/DELETE | `/api/budgets/[id]` | Editar ou deletar orçamento |
| GET/POST | `/api/goals` | Listar e criar metas financeiras |
| PATCH/DELETE | `/api/goals/[id]` | Editar ou deletar meta |
| GET/POST | `/api/recurring` | Listar e criar regras recorrentes |
| PATCH/DELETE | `/api/recurring/[id]` | Editar ou deletar regra recorrente |
| POST | `/api/recurring/detect` | Detectar recorrentes automaticamente nos imports |
| GET/POST | `/api/scheduled` | Listar e criar agendamentos |
| PATCH/DELETE | `/api/scheduled/[id]` | Editar ou deletar agendamento |
| POST | `/api/scheduled/[id]/pay` | Marcar agendamento como pago |
| GET/POST | `/api/installment-groups` | Listar grupos de parcelas |
| DELETE | `/api/installment-groups/[id]` | Deletar grupo de parcelas |
| GET | `/api/cashflow` | Projeção de fluxo de caixa |

### Assinaturas detectadas (C2.2)
| Método | Endpoint | Funcionalidade |
|--------|----------|----------------|
| GET | `/api/subscriptions` | Listar assinaturas detectadas (com `?include_dismissed=true`) |
| POST | `/api/subscriptions/detect` | Disparar detecção de assinaturas nos últimos 180 dias |
| PATCH | `/api/subscriptions/[id]/dismiss` | Dispensar assinatura detectada |

### Score de Saúde Financeira (C2.3)
| Método | Endpoint | Funcionalidade |
|--------|----------|----------------|
| GET | `/api/health-score` | Calcular e persistir score do mês (`?month=YYYY-MM`) |
| GET | `/api/health-score/history` | Histórico dos últimos 6 meses (ASC) |

### Relatório Mensal (C2.4)
| Método | Endpoint | Funcionalidade |
|--------|----------|----------------|
| GET | `/api/reports/monthly` | Listar relatórios gerados do usuário |
| POST | `/api/reports/monthly/generate` | Gerar relatório manualmente |
| GET | `/api/reports/monthly/[month]/download` | Download do PDF via Signed URL |
| POST | `/api/reports/monthly/cron` | Endpoint do Vercel Cron (D+1 de cada mês) |

### IRPF (C2.5)
| Método | Endpoint | Funcionalidade |
|--------|----------|----------------|
| GET | `/api/irpf` | Dados IRPF por ano (`?year=YYYY`) — saúde e educação |
| GET | `/api/irpf/export` | Download CSV ou PDF (`?year=YYYY&format=csv\|pdf`) |

### Push Notifications
| Método | Endpoint | Funcionalidade |
|--------|----------|----------------|
| POST | `/api/push/subscribe` | Registrar endpoint de push notification |
| POST | `/api/push/send` | Enviar push para usuário |

### Crons (internos)
| Método | Endpoint | Funcionalidade |
|--------|----------|----------------|
| POST | `/api/cron/check-budgets` | Verificar orçamentos ≥80%/100% e enviar push |

### Usuário e Billing
| Método | Endpoint | Funcionalidade |
|--------|----------|----------------|
| GET | `/api/user/export` | Exportar todos os dados JSON (LGPD art. 18) |
| DELETE | `/api/user/account` | Excluir conta com confirmação (LGPD art. 18) |
| PATCH | `/api/user/preferences` | Atualizar preferências (ex: monthly_report_email) |
| POST | `/api/checkout` | Iniciar checkout Asaas |
| POST | `/api/checkout/cancel` | Cancelar assinatura |
| POST | `/api/webhook/stripe` | ⚠️ Webhook de pagamento Asaas (arquivo nomeado stripe — inconsistência histórica) |

---

## Banco de Dados — Tabelas

| Tabela | Campos-chave | RLS | Propósito | Migration |
|--------|-------------|-----|-----------|-----------|
| `profiles` | id, display_name, plan, trial_ends_at, audio_enabled, ai_queries_this_month, ai_queries_reset_at, asaas_customer_id, monthly_report_email | ✅ | Perfil + plano + quotas IA + preferências | 001, 003, 005, 008, 025 |
| `bank_accounts` | id, user_id, bank_name, account_label, last_import_at | ✅ | Contas bancárias importadas | 001 |
| `imports` | id, user_id, bank_account_id, status (processing/categorizing/completed/failed), transaction_count | ✅ | Histórico de uploads + realtime | 001 |
| `transactions` | id, user_id, bank_account_id, external_id, date, description, amount, type, category, category_source (pending/ai/user/cache/rule), category_confidence, notes | ✅ | Core financeiro + notas inline | 001, 014, 022 |
| `transaction_tags` | id, transaction_id, user_id, tag | ✅ | Tags personalizadas por transação | 015 |
| `category_dictionary` | id, user_id, description_pattern, category, usage_count | ✅ | Regras aprendidas por uso do usuário (Tier 1) | 001 |
| `category_cache` | id, description_normalized, category, confidence, hit_count | ✅ (leitura pública) | Cache global cross-user (Tier 2) | 001 |
| `categorization_rules` | id, user_id, pattern, match_type (contains/exact/starts_with), category, priority, active | ✅ | Regras explícitas do usuário (Tier 0 — antes da IA) | 022 |
| `chat_messages` | id, user_id, role (user/assistant), content, created_at | ✅ | Histórico mensagens do chat | 010 |
| `chat_conversations` | id, user_id, title, last_message_at | ✅ | Sessões de chat (múltiplas conversas) | 010 |
| `subscriptions` | id, user_id, asaas_subscription_id, plan, status, current_period_start, current_period_end | ✅ | Assinaturas Asaas (billing) | 013 |
| `budgets` | id, user_id, category, monthly_limit | ✅ | Orçamentos mensais por categoria | 004 |
| `goals` | id, user_id, name, target_amount, current_amount, deadline, status (active/completed/canceled) | ✅ | Metas financeiras | 004 |
| `installment_groups` | id, user_id, bank_account_id, description, total_amount, installment_count, installment_amount, first_date, source | ✅ | Grupos de compras parceladas | 012 |
| `recurring_rules` | id, user_id, bank_account_id, description, amount, type, frequency (weekly/biweekly/monthly/annual), next_due_date, status (active/paused/canceled) | ✅ | Regras de recorrência manuais | 012 |
| `scheduled_transactions` | id, user_id, bank_account_id, description, amount, type, due_date, status (pending/paid/overdue/canceled), recurring_rule_id, installment_group_id | ✅ | Contas agendadas | 012 |
| `duplicate_alerts` | id, user_id, transaction_id_1, transaction_id_2, status (pending/dismissed) | ✅ | Alertas de cobranças duplicadas detectadas | 018 |
| `push_subscriptions` | id, user_id, endpoint, keys (auth/p256dh), created_at | ✅ | Endpoints de Web Push por usuário | 019, 020 |
| `budget_alert_log` | id, user_id, budget_id, threshold (80/100), month, sent_at | ✅ | Log de alertas de orçamento enviados (anti-spam) | 021 |
| `detected_subscriptions` | id, user_id, description_normalized, current_amount, previous_amount, frequency, price_change_detected, dismissed_at | ✅ | Assinaturas detectadas algoritmicamente (C2.2) | 023 |
| `health_score_history` | id, user_id, month (date), score (0-100), savings_rate_score, budget_compliance_score, goals_progress_score, diversification_score | ✅ | Histórico do score de saúde financeira (C2.3) | 024 |
| `monthly_reports` | id, user_id, month, pdf_path, email_sent_at, created_at, updated_at | ✅ | Registros de relatórios PDF gerados (C2.4) | 025 |
| `events` | id, user_id, event_name, properties, created_at | ✅ | Analytics interno | 009 |

### Tabela `transactions` — campos completos

```
id                   uuid         PK
user_id              uuid         FK auth.users (RLS)
bank_account_id      uuid         FK bank_accounts
external_id          text         ID OFX/banco ou "manual_{uuid}" (UNIQUE por conta)
date                 date         YYYY-MM-DD
description          text         Descrição original do banco (max 255)
amount               numeric      Valor absoluto (sempre positivo)
type                 text         'credit' | 'debit'
category             text         Uma das 14 categorias fixas
category_source      text         'pending' | 'ai' | 'user' | 'cache' | 'rule'
category_confidence  numeric      0.0–1.0 (preenchido quando source = 'ai')
notes                text         Nota livre do usuário (nullable, max 500 chars)
created_at           timestamptz  Auto
updated_at           timestamptz  Auto-update via trigger
```

### Storage bucket
| Bucket | Visibilidade | Propósito |
|--------|-------------|-----------|
| `reports` | Privado (public=false) | PDFs dos relatórios mensais — path: `{userId}/{YYYY-MM}.pdf` |

---

## Edge Functions (Supabase Deno)

| Função | Arquivo | Propósito |
|--------|---------|-----------|
| `categorize-import` | `supabase/functions/categorize-import/index.ts` | Categorização assíncrona pós-import: Tier 0 (regras), → Tier 1 (dicionário), → Tier 2 (cache), → Tier 3 (Claude Haiku batch) |
| `check-budget-alerts` | `supabase/functions/check-budget-alerts/index.ts` | Verificar orçamentos ≥80%/100% e enviar Web Push; usa `budget_alert_log` para evitar spam |

---

## Vercel Crons (`vercel.json`)

| Endpoint | Schedule | Quando executa |
|----------|----------|----------------|
| `/api/cron/check-budgets` | `0 8 * * *` | Diariamente às 8h |
| `/api/reports/monthly/cron` | `0 9 1 * *` | Dia 1 de cada mês às 9h |

---

## Features por Área

### Dashboard (`/dashboard`)

#### Cards e Métricas
| Feature | Status | Notas |
|---------|--------|-------|
| Card Receitas do mês | ✅ | `SummaryCards` com comparativo % mês anterior |
| Card Despesas do mês | ✅ | `SummaryCards` com comparativo % mês anterior |
| Card Saldo (receitas − despesas) | ✅ | Inclui taxa de poupança |
| Progresso do mês (dias corridos/restantes) | ✅ | Só no mês atual |
| Projeção de despesas ao fim do mês | ✅ | Média diária × dias restantes |
| Próximas contas a vencer (7 dias) | ✅ | `UpcomingBillsCard` — `scheduled_transactions` status pending/overdue |
| Safe-to-spend card ("quanto posso gastar hoje?") | ✅ | `SafeToSpendCard` + `calculateSafeToSpend()` |
| Alertas de duplicata | ✅ | `DuplicateAlertsCard` — dispensável inline |
| Sazonalidades BR (IPVA, IPTU, 13o, IRPF) | ✅ | `SeasonalityCard` — estima próxima ocorrência |
| Assinaturas detectadas (C2.2) | ✅ | `SubscriptionsCard` — total mensal + badge de reajuste |
| Score de saúde financeira (C2.3) | ✅ | `HealthScoreCard` — score 0-100, badge, mini gráfico, detalhe dos componentes |
| Empty state com CTA importar | ✅ | `DashboardEmptyState` |

#### Gráficos
| Gráfico | Status | Notas |
|---------|--------|-------|
| Gasto semanal (linha) | ✅ | `SpendingChart` — lazy-loaded |
| Distribuição por categoria (pizza) | ✅ | `CategoryChart` — lazy-loaded |
| Tabela de gastos por categoria com valores | ✅ | `SpendingBreakdown` |
| Cards de categoria com comparativo mês anterior | ✅ | `CategoryCards` |
| Heatmap de gastos por dia | ⬜ | Não implementado |
| Comparativo multi-período (trimestre/ano) | ⬜ | `CategoryCards` tem tendência mês a mês, sem view trimestral/anual dedicada |
| Evolução patrimonial (net worth) | ⬜ | Não implementado |

#### Filtros
| Filtro | Status | Notas |
|--------|--------|-------|
| Seletor de mês | ✅ | `MonthPicker` + `?month=YYYY-MM` na URL |

---

### Transações (`/transactions`)

#### Listagem e Filtros
| Feature | Status | Notas |
|---------|--------|-------|
| Listar transações do mês | ✅ | Server Component |
| Paginação com "carregar mais" | ✅ | `use-transactions.ts` |
| Contador de resultados | ✅ | |
| Filtro por mês (URL `?month=YYYY-MM`) | ✅ | |
| Filtro por tipo (receita/despesa/todos) | ✅ | `?type=credit\|debit\|all` |
| Filtro por categoria (14 categorias) | ✅ | `?category=alimentacao` |
| Busca por descrição (debounced 300ms) | ✅ | `?search=texto` — client-side |
| Filtros persistidos na URL | ✅ | `router.replace()` |
| Banner IRPF quando filtro é saúde ou educação | ✅ | Link direto → /more/irpf (C2.5) |

#### Ações por transação
| Ação | Status | Notas |
|------|--------|-------|
| Criar transação manual | ✅ | `TransactionForm` + `POST /api/transactions` |
| Editar transação existente | ✅ | `PATCH /api/transactions/[id]` |
| Deletar transação | ✅ | `DELETE /api/transactions/[id]` |
| Alterar categoria | ✅ | `category_source` vira `'user'` no PATCH |
| Notas em transações | ✅ | Campo `notes` na tabela + UI inline em `TransactionDetail` (auto-save) |
| Tags personalizadas | ✅ | Tabela `transaction_tags` + UI com autocomplete + `DELETE /api/transactions/[id]/tags/[tag]` |
| Tags exibidas na lista | ✅ | `TransactionItem` e `TransactionList` mostram notas e tags |
| Favoritar transação | ⬜ | Não implementado |
| Anexar comprovante/foto | ⬜ | Não implementado |

---

### Import (`/import`)

| Feature | Status | Notas |
|---------|--------|-------|
| Seletor de banco (Nubank, Itaú, Bradesco, Outro) | ✅ | Wizard passo 1 |
| Drag-and-drop de arquivo | ✅ | `FileDropzone` |
| Upload `POST /api/import` | ✅ | FormData com arquivo + bank_name |
| Status em tempo real (Realtime Supabase) | ✅ | Channel `import-${importId}` |
| Polling fallback (3s, 90s max) | ✅ | Se Realtime não dispara |
| Progresso visual (uploading → processing → categorizing → completed) | ✅ | `ImportProgress` |
| OFX (Open Financial Exchange) | ✅ | `src/lib/parsers/ofx-parser.ts` |
| CSV genérico (auto-detect `,` ou `;`) | ✅ | `src/lib/parsers/csv-parser.ts` |
| CSV Nubank | ✅ | `src/lib/parsers/bank-formats/nubank.ts` |
| CSV Itaú | ✅ | `src/lib/parsers/bank-formats/itau.ts` |
| CSV Bradesco | ✅ | `src/lib/parsers/bank-formats/bradesco.ts` |
| Deduplicação SHA-256 | ✅ | `external_id` único por conta |
| Limite de arquivo: 5MB | ✅ | Validação na API route |
| Paywall para mais de 1 conta | ✅ | `PaywallModal` |
| Fatura de cartão de crédito | ⬜ | Parsers são para extratos; fatura tem estrutura diferente |

---

### Chat IA (`/chat`)

| Feature | Status | Notas |
|---------|--------|-------|
| Chat com streaming (SSE) | ✅ | `POST /api/chat` via AI SDK `streamText` |
| Histórico de conversas (sidebar desktop) | ✅ | Tabela `chat_conversations` |
| Múltiplas conversas (criar nova, trocar) | ✅ | `handleNewConversation`, `handleSwitchConversation` |
| Drawer de histórico no mobile | ✅ | Toggle no header |
| Aviso de timeout | ✅ | `showTimeoutWarning` |
| Input por áudio (Pro) | ✅ | `POST /api/audio` — `canUseAudio` do `usePlan()` |
| Contador de queries usadas/limite | ✅ | Exibido no `ChatInput` |
| Chat flutuante desktop | ✅ | `FloatingChatPanel` em todas as páginas do app |
| Botão flutuante mobile | ✅ | `FloatingChatButton` |

#### Modelos e limites por plano
| Aspecto | Basic | Pro |
|---------|-------|-----|
| Modelo | Claude Haiku 4.5 | Claude Sonnet 4.6 |
| Limite mensal | 50 msgs/mês | 200 msgs/mês |
| Reset | Dia 1 de cada mês | Dia 1 de cada mês |
| Áudio | ⬜ | ✅ |
| Function calling (tools) | ⬜ | ✅ (`makeProTools()`) |
| Grace period (past_due) | — | 3 dias após vencimento |

#### Tools de function calling (Pro)
| Tool | Status | Ação |
|------|--------|------|
| Criar meta via chat | ✅ | `POST /api/goals` |
| Criar orçamento via chat | ✅ | `POST /api/budgets` |
| Atualizar transação via chat | ✅ | `PATCH /api/transactions/[id]` |

#### Contexto financeiro disponível para a IA
| Dado | Status |
|------|--------|
| Transações dos últimos 3 meses (agregado por categoria) | ✅ |
| Receitas e despesas totais | ✅ |
| Dados individuais de cada transação | ⬜ — apenas agregados no system prompt |

---

### Financeiro (`/financeiro/`)

#### Contas a Pagar/Receber (`/financeiro/contas`)
| Feature | Status | Notas |
|---------|--------|-------|
| Listar agendamentos pendentes/pagos (tabs) | ✅ | `ScheduledList` |
| Criar novo agendamento | ✅ | `ScheduledForm` |
| Marcar como pago | ✅ | `POST /api/scheduled/[id]/pay` |
| Cancelar agendamento | ✅ | PATCH status `'canceled'` |
| Deletar agendamento | ✅ | DELETE |
| Resumo A Pagar / A Receber / Saldo | ✅ | `ContasSummary` |

#### Fluxo de Caixa (`/financeiro/fluxo`)
| Feature | Status | Notas |
|---------|--------|-------|
| Projeção 30/60/90 dias | ✅ | Botões de horizonte |
| Gráfico de fluxo projetado | ✅ | `CashFlowChart` |
| Lista agrupada por mês | ✅ | |
| Limite Basic: 1 mês | ✅ | Check em `GET /api/cashflow` |
| Limite Pro: 12 meses | ✅ | |

#### Parcelas (`/financeiro/parcelas`)
| Feature | Status | Notas |
|---------|--------|-------|
| Listar grupos de parcelas | ✅ | `InstallmentGroupCard` |
| Ver detalhes completos | ✅ | |
| Deletar grupo | ✅ | |
| Detecção automática na importação | 🔶 | Tabela + hook existem, mas algoritmo de detecção no parser não verificado |
| Criação manual de grupo | ⬜ | Sem UI para criar manualmente |

#### Recorrentes (`/financeiro/recorrentes`)
| Feature | Status | Notas |
|---------|--------|-------|
| Criar regra recorrente | ✅ | `RecurringForm` — weekly/biweekly/monthly/annual |
| Pausar / Retomar regra | ✅ | `updateStatus(id, 'paused'\|'active')` |
| Deletar regra | ✅ | |
| Tabs Ativas / Pausadas | ✅ | |
| Detecção automática de recorrentes | ✅ | `POST /api/recurring/detect` |
| Limite Basic: máx 5 recorrentes | ✅ | Check server-side |
| Limite Pro: ilimitadas | ✅ | |
| **Assinaturas detectadas (C2.2)** | ✅ | `SubscriptionCard` + `SubscriptionsSummary` integrados nesta página |
| Dispensar assinatura detectada | ✅ | `PATCH /api/subscriptions/[id]/dismiss` |
| Badge de reajuste de preço | ✅ | `price_change_detected` flag + `previous_amount` |
| Filtrar dismissed | ✅ | `GET /api/subscriptions?include_dismissed=true` |

---

### Regras de Categorização — C2.1 (`/more/regras`)

| Feature | Status | Notas |
|---------|--------|-------|
| Criar regra (padrão + tipo de match + categoria + prioridade) | ✅ | `RuleFormDialog` |
| Tipos de match: contains, exact, starts_with | ✅ | |
| Ativar / Desativar regra | ✅ | `RuleCard` com toggle |
| Editar regra | ✅ | |
| Deletar regra | ✅ | |
| Badge contador ativas/limite | ✅ | |
| Limite Basic: máx 5 regras ativas | ✅ | Check server-side |
| Limite Pro: ilimitadas | ✅ | |
| Execução Tier 0 (antes da IA) na Edge Function | ✅ | Index `(user_id, active, priority DESC)` otimizado |
| category_source = 'rule' para matches | ✅ | Constraint estendida em migration 022 |

---

### Score de Saúde Financeira — C2.3 (Dashboard)

| Feature | Status | Notas |
|---------|--------|-------|
| Score 0-100 no dashboard | ✅ | `HealthScoreCard` |
| Badges: Crítico / Regular / Bom / Excelente | ✅ | `BADGE_CONFIG` em `lib/health-score/calculate.ts` |
| Mini gráfico de evolução (últimos 6 meses) | ✅ | Recharts `LineChart` no card |
| Detalhe dos 4 componentes | ✅ | savings_rate, budget_compliance, goals_progress, diversification |
| Persistência mensal no banco | ✅ | `health_score_history` (UNIQUE user_id + month) |
| Cálculo atualizado ao mudar mês no MonthPicker | ✅ | useEffect com cancelled guard para evitar race conditions |

---

### Relatório Mensal Automático — C2.4

| Feature | Status | Notas |
|---------|--------|-------|
| Geração automática no D+1 (Vercel Cron) | ✅ | `0 9 1 * *` → `POST /api/reports/monthly/cron` |
| PDF gerado com @react-pdf/renderer | ✅ | |
| PDF armazenado em bucket privado Supabase | ✅ | Bucket `reports`, path `{userId}/{YYYY-MM}.pdf` |
| Lista de relatórios em Settings > Dados | ✅ | `GET /api/reports/monthly` |
| Download via Signed URL | ✅ | `GET /api/reports/monthly/[month]/download` |
| Geração manual | ✅ | `POST /api/reports/monthly/generate` |
| Opt-in/opt-out em Settings > Dados | ✅ | `profiles.monthly_report_email` (LGPD DEFAULT false) |
| Envio por email (Resend) | 🔶 | API de geração existe; verificar se email está totalmente integrado |

---

### IRPF — C2.5 (`/more/irpf`)

| Feature | Status | Notas |
|---------|--------|-------|
| Seletor de ano (anterior por padrão) | ✅ | Array.from com currentYear inclusive |
| Dados por ficha IRPF: saúde e educação | ✅ | `GET /api/irpf?year=YYYY` |
| Mapeamento: saúde → "Despesas Médicas e de Saúde" | ✅ | `IRPF_FICHA` em `category-mapping.ts` |
| Mapeamento: educação → "Instrução" | ✅ | |
| Alerta de limite excedido (educação R$3.561,50) | ✅ | `EDUCATION_LIMITS` por ano; 2023–2025 definidos |
| Export CSV (UTF-8 BOM, ponto-e-vírgula, Excel BR) | ✅ | `GET /api/irpf/export?format=csv` |
| Export PDF (@react-pdf/renderer) | ✅ | `GET /api/irpf/export?format=pdf` |
| Aviso legal (não é consultoria fiscal) | ✅ | Disclaimer na página |
| Disponível em todos os planos (sem paywall) | ✅ | |
| Banner em /transactions quando filtro = saúde/educação | ✅ | Link direto para /more/irpf |
| Sem tabela própria — usa `transactions` existente | ✅ | Apenas filtra category IN ('saude','educacao') |
| total_deductible no response | ⬜ | Campo previsto no AC1, não incluído na implementação (mn1 — MINOR) |

---

### Metas e Orçamentos (`/more/`)

#### Metas (`/more/objetivos`)
| Feature | Status | Notas |
|---------|--------|-------|
| Criar meta (nome, valor-alvo, já economizado, prazo) | ✅ | `GoalDialog` |
| Editar e deletar meta | ✅ | |
| Atualizar progresso | ✅ | `ProgressDialog` |
| Progress bar visual (%) | ✅ | |
| Badge Vencido / Prazo próximo / OK | ✅ | |
| Marcar como concluída | ✅ | `markComplete()` |
| Seção de concluídas separada | ✅ | |
| Limite Basic: máx 2 metas ativas | ✅ | 403 na API |
| Limite Pro: ilimitadas | ✅ | |

#### Orçamentos (`/more/orcamentos`)
| Feature | Status | Notas |
|---------|--------|-------|
| Criar orçamento por categoria | ✅ | `BudgetForm` |
| Editar e deletar | ✅ | |
| Progress bar gasto vs limite | ✅ | `BudgetProgressCard` |
| Stats totais (desktop) | ✅ | |
| Gasto real calculado automaticamente | ✅ | `GET /api/budgets?month=YYYY-MM` |
| Limite Basic: máx 3 orçamentos | ✅ | 403 na API |
| Limite Pro: ilimitados | ✅ | |
| Alertas de orçamento (push ≥80%/100%) | ✅ | Cron diário 8h + Edge Function + `budget_alert_log` |

---

### Notificações

| Feature | Status | Notas |
|---------|--------|-------|
| Banner de trial expirando | ✅ | `TrialBanner` — global no layout |
| Banner offline | ✅ | `OfflineBanner` + `useOnlineStatus()` |
| Banner de onboarding incompleto | ✅ | `OnboardingBanner` |
| Prompt de instalação PWA | ✅ | `PwaInstallBanner` + `usePwaInstall()` |
| Cookie consent | ✅ | `CookieConsent` |
| Banner de permissão de push | ✅ | `PushPermissionBanner` — solicita permissão ao usuário |
| Web Push (alertas de orçamento ≥80%/100%) | ✅ | `push_subscriptions` + `POST /api/push/send` + Cron |
| Bill reminders push (antes de vencimento) | ⬜ | `UpcomingBillsCard` é passivo — sem push proativo |
| WhatsApp: alertas e consultas | ⬜ | Não implementado |

---

### Settings (`/settings`)

#### Aba Perfil
| Feature | Status |
|---------|--------|
| Ver email | ✅ |
| Editar nome de exibição (`display_name`) | ✅ |
| Foto de perfil | ⬜ |
| Alterar senha | ⬜ |

#### Aba Plano
| Feature | Status | Notas |
|---------|--------|-------|
| Ver plano atual (Basic/Pro) | ✅ | |
| Comparação Basic vs Pro (desktop) | ✅ | |
| Trial: dias restantes + data de expiração | ✅ | |
| CTA para assinar Pro | ✅ | `POST /api/checkout` → Asaas URL |
| Cancelar assinatura | ✅ | `POST /api/checkout/cancel` |
| Próximo vencimento | ✅ | `subscriptions.current_period_end` |

#### Aba Dados
| Feature | Status | Notas |
|---------|--------|-------|
| Exportar dados JSON (LGPD portabilidade) | ✅ | `GET /api/user/export` |
| Excluir conta (com digitação de confirmação) | ✅ | `DELETE /api/user/account` |
| Links Política de Privacidade e Termos | ✅ | |
| Lista de relatórios mensais gerados | ✅ | `GET /api/reports/monthly` com download PDF (C2.4) |
| Opt-in relatório por email | ✅ | `PATCH /api/user/preferences` → `monthly_report_email` (C2.4) |

---

### PWA

| Feature | Status | Notas |
|---------|--------|-------|
| Service Worker (@serwist/next) | ✅ | `src/sw.ts` → `public/sw.js` |
| Manifest | ✅ | |
| Instalação em Android/iOS | ✅ | `PwaInstallBanner` + `usePwaInstall()` |
| Offline fallback page | ✅ | `/offline/page.tsx` |
| Offline banner durante navegação | ✅ | `OfflineBanner` |
| Sentry error tracking | ✅ | `withSentryConfig` no `next.config.ts` |

---

### LGPD

| Feature | Status | Notas |
|---------|--------|-------|
| Cookie consent explícito | ✅ | `CookieConsent` |
| Exportar dados JSON (portabilidade — art. 18) | ✅ | `GET /api/user/export` |
| Excluir conta (esquecimento — art. 18) | ✅ | `DELETE /api/user/account` |
| Opt-out relatório por email (consentimento) | ✅ | `monthly_report_email` DEFAULT false |
| Política de privacidade dedicada | ✅ | `/(public)/privacy` |
| Termos de uso dedicados | ✅ | `/(public)/terms` |

---

### Landing Page (`/`)

| Feature | Status |
|---------|--------|
| Hero com CTA | ✅ |
| Comparativo de planos | 🔶 Copy de preços/limites pode estar desatualizada vs `src/lib/billing/plans.ts` |
| Nav mobile responsivo | ✅ — `MobileNav` + `animations.tsx` |
| Animações (motion primitives) | ✅ |

---

### Onboarding (`/onboarding`)

| Feature | Status | Notas |
|---------|--------|-------|
| Step 1: Boas-vindas | ✅ | `StepWelcome` |
| Step 2: Importar extrato | ✅ | `StepImport` |
| Step 3: Concluído | ✅ | `StepDone` |
| Stepper visual | ✅ | `Stepper` |
| Banner para onboarding incompleto | ✅ | `OnboardingBanner` nas páginas do app |

---

## Planos — Resumo Comparativo

| Feature | Basic (R$19,90/mês) | Pro (R$49,90/mês) |
|---------|---------------------|-------------------|
| Contas bancárias | 1 | Ilimitadas |
| Histórico de transações | Mês atual | Ilimitado |
| Categorização IA | ✅ | ✅ |
| Regras de categorização | máx 5 ativas | Ilimitadas |
| Dashboard completo | ✅ | ✅ |
| Chat IA | 50 msgs/mês — Claude Haiku 4.5 | 200 msgs/mês — Claude Sonnet 4.6 |
| Function calling no chat | ⬜ | ✅ |
| Entrada por áudio | ⬜ | ✅ |
| Orçamentos | máx 3 | Ilimitados |
| Metas financeiras | máx 2 | Ilimitadas |
| Recorrentes manuais | máx 5 | Ilimitadas |
| Projeção cashflow | 1 mês | 12 meses |
| IRPF (C2.5) | ✅ | ✅ |
| Relatório mensal PDF (C2.4) | ✅ | ✅ |
| Trial 7 dias Pro automático | ✅ | — |

---

## O que NÃO existe ainda

Comparado com `docs/market-research-features.md` — itens **sem código no codebase**.

### Prioridade Alta (alto impacto, esforço médio)
| Feature | Status |
|---------|--------|
| **Comparativo multi-período** (trimestre/ano — view dedicada) | ⬜ `CategoryCards` tem tendência mês-a-mês, sem view trimestral |
| **Previsão de gastos do próximo mês** (ML/tendência) | ⬜ |
| **Sugestão de economia por padrão de gastos** | ⬜ |
| **Bill reminders via push** (alerta antes do vencimento) | ⬜ `UpcomingBillsCard` é passivo |
| **Open Finance Brasil** (sync bancário automático) | ⬜ |
| **Fatura de cartão de crédito** (importação) | ⬜ Parsers são para extratos |
| **WhatsApp: alertas e consultas** | ⬜ |

### Prioridade Média (esforço médio/alto)
| Feature | Status |
|---------|--------|
| **Heatmap de gastos por dia** | ⬜ |
| **Net worth tracking** (evolução patrimonial) | ⬜ |
| **Foto de perfil** | ⬜ |
| **Alterar senha** | ⬜ |
| **total_deductible no response IRPF** | ⬜ mn1 do C2.5 — MINOR não corrigido |
| **Criação manual de grupo de parcelas** | ⬜ |
| **Reconciliação automática** (match manual × importado) | ⬜ |
| **Favoritar transação** | ⬜ |
| **Anexar comprovante/foto** em transação | ⬜ |

### Prioridade Futuro (esforço alto ou escopo grande)
| Feature | Status |
|---------|--------|
| **Modo família** (multi-usuário, orçamentos compartilhados) | ⬜ Schema é single-tenant |
| **Divisão de despesas** (rachar conta) | ⬜ |
| **Modo MEI/autônomo** (DAS, nota fiscal, renda variável) | ⬜ |
| **Gestão de dívidas** (snowball/avalanche) | ⬜ |
| **Cashback/benefícios não aproveitados** | ⬜ |

---

## Inconsistências no Codebase

| Inconsistência | Localização | Nota |
|----------------|------------|------|
| Arquivo webhook chamado "stripe" mas produto usa Asaas | `src/app/api/webhook/stripe/route.ts` | Resquício de troca de gateway |
| Settings "Plano" pode buscar `stripe_subscription_id` | `src/app/(app)/settings/page.tsx` | Verificar cancelamento de assinatura |
| Landing page — copy de planos pode estar defasado vs `plans.ts` | `src/app/page.tsx` vs `src/lib/billing/plans.ts` | Verificar preços e limites |
| IRPF: `total_deductible` ausente no response | `src/app/api/irpf/route.ts` | mn1 do C2.5 — MINOR registrado em `docs/backlog.md` |

---

*Compilado por Atlas (@analyst) — Abril 2026 — pós Ciclo 2*
*Varredura direta: 23 páginas · 47 API routes · 23 tabelas · 2 Edge Functions · 2 Vercel Crons · 39 test files · 82 componentes*

— Atlas, investigando a verdade 🔎
