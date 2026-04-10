# Finansim — Inventário Completo de Features

**Data:** Abril 2026  
**Analista:** Atlas (@analyst)  
**Metodologia:** Varredura direta do código-fonte — pages, API routes, components, hooks, lib, migrations SQL.  
**Status:** ✅ Implementado e funcional | 🔶 Parcial / disponível via chat | ⬜ Não existe no codebase

---

## Features de Transações

### Listagem (`/transactions`)
| Feature | Status | Arquivo |
|---------|--------|---------|
| Listar transações do mês | ✅ | `src/app/(app)/transactions/page.tsx` |
| Paginação com "carregar mais" (load more) | ✅ | `src/hooks/use-transactions.ts` |
| Contador de resultados encontrados | ✅ | `src/app/(app)/transactions/page.tsx:125` |

### Filtros disponíveis
| Filtro | Status | Notas |
|--------|--------|-------|
| Por mês (YYYY-MM via URL) | ✅ | `?month=2026-03` |
| Por tipo (receita/despesa/todos) | ✅ | `?type=credit\|debit\|all` |
| Por categoria (14 categorias) | ✅ | `?category=alimentacao` |
| Busca por descrição (debounced 300ms) | ✅ | `?search=texto` — filtro client-side com debounce |
| Filtros persistidos na URL | ✅ | `router.replace()` ao mudar qualquer filtro |

### Ações por transação
| Ação | Status | Arquivo |
|------|--------|---------|
| Criar transação manual | ✅ | `POST /api/transactions` + `TransactionForm` |
| Editar transação existente | ✅ | `PATCH /api/transactions/[id]` |
| Deletar transação | ✅ | `DELETE /api/transactions/[id]` |
| Alterar categoria (correção) | ✅ | Parte do PATCH; `category_source` vira `'user'` |
| Notas em transações | ⬜ | Campo não existe no schema — ver tabela `transactions` |
| Tags personalizadas | ⬜ | Não existe tabela `transaction_tags` |
| Favoritar transação | ⬜ | Não implementado |
| Anexar comprovante/foto | ⬜ | Não implementado |

### Campos armazenados por transação (tabela `transactions`)
| Campo | Tipo | Descrição |
|-------|------|-----------|
| `id` | uuid | PK |
| `user_id` | uuid | FK auth.users (RLS) |
| `bank_account_id` | uuid | FK bank_accounts |
| `external_id` | text | ID do banco/OFX ou `manual_{uuid}` |
| `date` | date | Data da transação |
| `description` | text | Descrição original |
| `amount` | numeric | Valor absoluto (positivo) |
| `type` | text | `'credit'` ou `'debit'` |
| `category` | text | Uma das 14 categorias |
| `category_source` | text | `'pending'`, `'ai'`, `'user'`, `'cache'` |
| `category_confidence` | numeric | Confiança da IA (0-1) |
| `created_at` | timestamptz | Auto |
| `updated_at` | timestamptz | Auto-update via trigger |

**Campos NÃO existentes:** `notes`, `tags`, `receipt_url`, `is_favorite`, `recurring_rule_id`

---

## Features de Dashboard

### Cards/Métricas (`/dashboard`)
| Feature | Status | Notas |
|---------|--------|-------|
| Card Receitas do mês | ✅ | `SummaryCards` com valor e comparativo % mês anterior |
| Card Despesas do mês | ✅ | `SummaryCards` com valor e comparativo % mês anterior |
| Card Saldo (receitas − despesas) | ✅ | `SummaryCards` — inclui taxa de poupança |
| Comparativo mês anterior nos cards | ✅ | `SummaryCards` com seta verde/vermelha |
| Taxa de poupança | ✅ | Calculada nos `SummaryCards` |
| Progresso do mês (dias corridos vs restantes) | ✅ | Só exibido no mês atual |
| Projeção de despesas ao fim do mês | ✅ | Apenas mês atual — baseado em média diária |
| Próximas contas a vencer (7 dias) | ✅ | `UpcomingBillsCard` — `scheduled_transactions` status `pending`/`overdue` |
| Empty state com CTA importar | ✅ | `DashboardEmptyState` |

### Gráficos
| Gráfico | Status | Notas |
|---------|--------|-------|
| Gasto semanal (linha) | ✅ | `SpendingChart` — lazy-loaded |
| Distribuição por categoria (pizza) | ✅ | `CategoryChart` — lazy-loaded |
| Tabela de gastos por categoria com valores | ✅ | `SpendingBreakdown` |
| Cards de categoria com comparativo mês anterior | ✅ | `CategoryCards` |
| Fluxo de caixa projetado (cashflow chart) | ✅ | `CashFlowChart` em `/financeiro/fluxo` |
| Score de saúde financeira | ⬜ | Não implementado |
| Heatmap de gastos por dia | ⬜ | Não implementado |
| Comparativo multi-período (trimestre/ano) | ⬜ | Não implementado |
| Evolução patrimonial (net worth) | ⬜ | Não implementado |

### Filtros do Dashboard
| Filtro | Status | Notas |
|--------|--------|-------|
| Seletor de mês | ✅ | `MonthPicker` — `?month=YYYY-MM` na URL |

---

## Features de Importação (`/import`)

### Formatos suportados
| Formato | Status | Arquivo |
|---------|--------|---------|
| OFX (padrão Open Financial Exchange) | ✅ | `src/lib/parsers/ofx-parser.ts` |
| CSV genérico (auto-detect delimitador `,` ou `;`) | ✅ | `src/lib/parsers/csv-parser.ts` |
| CSV Nubank (formato específico) | ✅ | `src/lib/parsers/bank-formats/nubank.ts` |
| CSV Itaú (formato específico) | ✅ | `src/lib/parsers/bank-formats/itau.ts` |
| CSV Bradesco (formato específico) | ✅ | `src/lib/parsers/bank-formats/bradesco.ts` |
| Importação de fatura de cartão de crédito | ⬜ | Não há parser específico para faturas |

### Fluxo completo
| Etapa | Status | Notas |
|-------|--------|-------|
| Seletor de banco (Nubank, Itaú, Bradesco, Outro) | ✅ | Wizard passo 1 |
| Drag-and-drop de arquivo (FileDropzone) | ✅ | Wizard passo 2 |
| Upload via `POST /api/import` | ✅ | FormData com arquivo + bank_name |
| Status em tempo real (Realtime Supabase) | ✅ | Channel `import-${importId}` |
| Polling fallback (3s interval, 90s max) | ✅ | Se Realtime não dispara |
| Progress visual (uploading → processing → categorizing → completed/failed) | ✅ | `ImportProgress` |
| Deduplicação automática (SHA-256) | ✅ | `external_id` único por conta |
| Paywall se Basic atingiu limite de contas | ✅ | `PaywallModal` |
| Limite de arquivo: 5MB | ✅ | Validação na API route |

---

## Features de Chat IA (`/chat`)

### Interface
| Feature | Status | Notas |
|---------|--------|-------|
| Chat com streaming (SSE) | ✅ | `POST /api/chat` via AI SDK `streamText` |
| Histórico de conversas (sidebar desktop) | ✅ | Tabela `chat_conversations` |
| Múltiplas conversas (criar nova, trocar) | ✅ | `handleNewConversation`, `handleSwitchConversation` |
| Drawer de histórico no mobile | ✅ | Toggle no header |
| Aviso de timeout | ✅ | `showTimeoutWarning` após X segundos |
| Input por áudio (Pro) | ✅ | `canUseAudio` — `POST /api/audio` (Whisper) |
| Contador de queries usadas/limite | ✅ | `queriesUsed` / `queriesLimit` exibidos no `ChatInput` |
| Chat flutuante no desktop (não é a /chat page) | ✅ | `FloatingChatPanel` disponível em todas as páginas (app) |
| Botão flutuante chat mobile | ✅ | `FloatingChatButton` |

### Modelos e limites por plano
| Aspecto | Basic | Pro |
|---------|-------|-----|
| Modelo | Gemini 2.0 Flash | Gemini 2.5 Flash |
| Limite mensal | 50 msgs/mês | 200 msgs/mês |
| Reset | Dia 1 de cada mês | Dia 1 de cada mês |
| Áudio | ⬜ | ✅ (`audio_enabled = true`) |
| Function calling tools | ⬜ | ✅ (`makeProTools()`) |
| Grace period (past_due) | — | 3 dias após vencimento |

### Contexto financeiro disponível para a IA
| Dado | Status | Notas |
|------|--------|-------|
| Transações dos últimos 3 meses (agregado) | ✅ | `buildFinancialContext()` |
| Totais por categoria | ✅ | No system prompt |
| Receitas e despesas totais | ✅ | No system prompt |
| Dados individuais de cada transação | ⬜ | Apenas agregados, não raw |

### Tools (Function Calling — Pro)
| Tool | Status | Ação |
|------|--------|------|
| Criar meta financeira via chat | ✅ | `POST /api/goals` via tool |
| Criar orçamento via chat | ✅ | `POST /api/budgets` via tool |
| Atualizar transação via chat | ✅ | `PATCH /api/transactions/[id]` via tool |

---

## Features de Metas e Orçamentos (`/more/`)

### Sub-rotas existentes em `/more/`
| Rota | Existe? | Feature |
|------|---------|---------|
| `/more/objetivos` | ✅ | Metas financeiras com UI dedicada |
| `/more/orcamentos` | ✅ | Orçamentos mensais por categoria |
| `/more/` (hub) | ✅ | Página hub (sem conteúdo próprio, lista as seções) |

### Objetivos/Metas (`/more/objetivos`)
| Feature | Status | Notas |
|---------|--------|-------|
| Criar nova meta (nome, valor-alvo, já economizado, prazo) | ✅ | `GoalDialog` |
| Editar meta existente | ✅ | Mesmo dialog |
| Atualizar progresso economizado | ✅ | `ProgressDialog` |
| Progress bar visual (%) | ✅ | Card com barra |
| Badge de status (Vencido / Prazo próximo / OK) | ✅ | Calculado por `deadline` |
| Marcar meta como concluída | ✅ | `markComplete()` — move para seção "Concluídos" |
| Deletar meta | ✅ | `remove()` |
| Seção separada de metas concluídas | ✅ | Exibidas com opacidade reduzida |
| Limite Basic: máx 2 metas ativas | ✅ | Check server-side em `POST /api/goals` |
| Limite Pro: ilimitadas | ✅ | |

### Orçamentos (`/more/orcamentos`)
| Feature | Status | Notas |
|---------|--------|-------|
| Criar orçamento por categoria (limite mensal) | ✅ | `BudgetForm` |
| Editar limite de orçamento | ✅ | `PATCH /api/budgets/[id]` |
| Deletar orçamento | ✅ | `DELETE /api/budgets/[id]` |
| Progress bar de gasto vs limite | ✅ | `BudgetProgressCard` com % consumido |
| Stats totais (limite total, % geral) — desktop | ✅ | Header da página |
| Gasto real calculado automaticamente | ✅ | `GET /api/budgets?month=YYYY-MM` soma transações |
| Limite Basic: máx 3 orçamentos | ✅ | Check server-side em `POST /api/budgets` |
| Limite Pro: ilimitados | ✅ | |
| Alertas de orçamento (push/email quando ≥80%) | ⬜ | Não implementado |

---

## Features de Financeiro (`/financeiro/`)

### Sub-rotas existentes em `/financeiro/`
| Rota | Feature | Status |
|------|---------|--------|
| `/financeiro/contas` | Contas a pagar e receber agendadas | ✅ Funcional |
| `/financeiro/fluxo` | Projeção de fluxo de caixa | ✅ Funcional |
| `/financeiro/parcelas` | Compras parceladas detectadas | ✅ Funcional |
| `/financeiro/recorrentes` | Regras de transações recorrentes | ✅ Funcional |

### Contas a Pagar/Receber (`/financeiro/contas`)
| Feature | Status | Notas |
|---------|--------|-------|
| Listar agendamentos pendentes e pagos (tabs) | ✅ | `ScheduledList` |
| Criar novo agendamento | ✅ | `ScheduledForm` — dialog |
| Marcar como pago | ✅ | `POST /api/scheduled/[id]/pay` |
| Cancelar agendamento | ✅ | `PATCH /api/scheduled/[id]` status `'canceled'` |
| Deletar agendamento | ✅ | `DELETE /api/scheduled/[id]` |
| Resumo A Pagar / A Receber / Saldo | ✅ | `ContasSummary` |
| Filtros por status / tipo / período | ✅ | Query params na API |

### Fluxo de Caixa (`/financeiro/fluxo`)
| Feature | Status | Notas |
|---------|--------|-------|
| Projeção 30/60/90 dias | ✅ | Botões de horizonte |
| Gráfico de fluxo projetado | ✅ | `CashFlowChart` |
| Lista agrupada por mês | ✅ | `scheduled_transactions` agrupadas |
| Ações inline: pagar, cancelar, deletar | ✅ | |
| Limite Basic: 1 mês ahead | ✅ | Check em `GET /api/cashflow` |
| Limite Pro: 12 meses ahead | ✅ | |

### Parcelas (`/financeiro/parcelas`)
| Feature | Status | Notas |
|---------|--------|-------|
| Listar grupos de parcelas | ✅ | `InstallmentGroupCard` |
| Ver detalhes: descrição, total, nº parcelas, valor/parcela, primeira data | ✅ | |
| Deletar grupo de parcelas | ✅ | `remove()` via hook |
| Detecção automática na importação | 🔶 | Existe tabela + hook, mas sem evidência do algoritmo de detecção no parser |
| Criação manual de grupo | ⬜ | Sem UI para criar manualmente |

### Recorrentes (`/financeiro/recorrentes`)
| Feature | Status | Notas |
|---------|--------|-------|
| Criar regra recorrente (salário, aluguel, assinatura) | ✅ | `RecurringForm` — frequências: weekly, biweekly, monthly, annual |
| Pausar / Retomar regra | ✅ | `updateStatus(id, 'paused'\|'active')` |
| Deletar regra | ✅ | `remove(id)` |
| Tabs Ativas / Pausadas | ✅ | |
| Cálculo automático de próxima ocorrência (`next_due_date`) | ✅ | Na criação via API |
| Criação de instância `scheduled_transaction` na criação da regra | ✅ | `POST /api/recurring` |
| Detecção automática de recorrentes na importação | ✅ | `POST /api/recurring/detect` existe |
| Limite Basic: máx 5 recorrentes | ✅ | Check em `POST /api/recurring` |
| Limite Pro: ilimitadas | ✅ | |

---

## Features de Settings (`/settings`)

### Abas disponíveis
| Aba | Rota query | O que faz |
|-----|-----------|-----------|
| **Perfil** | `?tab=perfil` | Ver email, editar nome de exibição (`display_name`) |
| **Plano** | `?tab=plano` | Ver plano atual, comparar Basic vs Pro, assinar/cancelar, ver próximo vencimento |
| **Dados** | `?tab=dados` | Exportar dados JSON (LGPD), ver docs legais, excluir conta |

### Aba Perfil
| Feature | Status |
|---------|--------|
| Ver email | ✅ |
| Editar nome de exibição | ✅ |
| Foto de perfil | ⬜ |
| Alterar senha | ⬜ |
| Notificações / preferências | ⬜ |

### Aba Plano
| Feature | Status | Notas |
|---------|--------|-------|
| Ver plano atual (Basic/Pro) | ✅ | |
| Comparação lado a lado Basic vs Pro (desktop) | ✅ | |
| Ver limites (contas, msgs IA) | ✅ | |
| Trial: dias restantes e data de expiração | ✅ | |
| CTA para assinar Pro | ✅ | `POST /api/checkout` → Asaas checkout URL |
| Cancelar assinatura | ✅ | `POST /api/checkout/cancel` (usa `stripe_subscription_id` — inconsistência com Asaas) |
| Próximo vencimento | ✅ | Busca em `subscriptions.current_period_end` |

### Aba Dados (LGPD)
| Feature | Status | Notas |
|---------|--------|-------|
| Exportar todos os dados (JSON) | ✅ | `GET /api/user/export` — download automático |
| Excluir conta (com confirmação) | ✅ | `DELETE /api/user/account` — tipo "EXCLUIR" para confirmar |
| Links Política de Privacidade e Termos | ✅ | |

---

## Features de Planos

### Resumo Comparativo
| Feature | Basic (R$19,90/mês) | Pro (R$49,90/mês) |
|---------|---------------------|-------------------|
| Contas bancárias | 1 | Ilimitadas |
| Histórico de transações | Mês atual | Ilimitado |
| Categorização automática IA | ✅ | ✅ |
| Dashboard completo + charts | ✅ | ✅ |
| Chat IA | ✅ (50 msgs/mês, Gemini 2.0 Flash) | ✅ (200 msgs/mês, Gemini 2.5 Flash) |
| Function calling no chat (ações) | ⬜ | ✅ |
| Entrada por áudio (Whisper) | ⬜ | ✅ |
| Orçamentos | máx 3 | Ilimitados |
| Metas financeiras | máx 2 | Ilimitadas |
| Recorrentes | máx 5 | Ilimitadas |
| Projeção cashflow | 1 mês | 12 meses |
| Trial 7 dias Pro automático | ✅ | — |

### Bloqueados por plano (paywall)
- Mais de 1 conta bancária → `PaywallModal` no import
- Chat com function calling → Basic sem tools
- Áudio no chat → `canUseAudio` do `usePlan()`
- Mais de 3 orçamentos → 403 na API
- Mais de 2 metas → 403 na API
- Mais de 5 recorrentes → 403 na API
- Cashflow além de 1 mês → limitado na `GET /api/cashflow`

---

## Features de Notificações

| Feature | Status | Notas |
|---------|--------|-------|
| Banner de trial expirando (`TrialBanner`) | ✅ | Exibido globalmente no layout |
| Banner offline (`OfflineBanner`) | ✅ | Detectado por `useOnlineStatus()` |
| Banner de onboarding incompleto (`OnboardingBanner`) | ✅ | Para usuários novos |
| Prompt de instalação PWA (`PwaInstallBanner`) | ✅ | Detectado por `usePwaInstall()` |
| Cookie consent (`CookieConsent`) | ✅ | |
| Alertas de orçamento (push notification quando ≥ 80%) | ⬜ | Não implementado |
| Bill reminders (push antes de vencimento) | ⬜ | `UpcomingBillsCard` existe no dashboard mas sem push |
| Web push via PWA service worker | ⬜ | PWA instalável mas sem push notifications |
| WhatsApp: alertas e consultas | ⬜ | Não implementado |
| Email: relatório mensal | ⬜ | Não implementado |

---

## Banco de Dados — Tabelas Existentes

### Tabelas confirmadas nas migrations

| Tabela | Campos-chave | RLS | Propósito |
|--------|-------------|-----|-----------|
| `profiles` | id (=auth.users), display_name, plan (`basic`/`pro`), trial_ends_at, audio_enabled, ai_queries_this_month, ai_queries_reset_at, asaas_customer_id | ✅ | Perfil + plano + quotas IA |
| `bank_accounts` | id, user_id, bank_name, account_label, last_import_at | ✅ | Contas importadas |
| `imports` | id, user_id, bank_account_id, status (processing/categorizing/completed/failed), transaction_count | ✅ | Histórico de uploads + realtime |
| `transactions` | id, user_id, bank_account_id, external_id, date, description, amount, type, category, category_source, category_confidence | ✅ | Core financeiro |
| `category_dictionary` | id, user_id, description_pattern, category, usage_count | ✅ | Regras aprendidas do usuário |
| `category_cache` | id, description_normalized, category, confidence, hit_count | ✅ (leitura pública) | Cache global para reuso entre usuários |
| `chat_messages` | id, user_id, role (user/assistant), content, created_at | ✅ | Histórico mensagens |
| `chat_conversations` | id, user_id, title, last_message_at | ✅ | Sessões de chat (múltiplas conversas) |
| `subscriptions` | id, user_id, asaas_subscription_id, plan, status (active/past_due/canceled), current_period_start, current_period_end | ✅ | Assinaturas Asaas |
| `budgets` | id, user_id, category, monthly_limit, created_at, updated_at | ✅ | Limites mensais por categoria |
| `goals` | id, user_id, name, target_amount, current_amount, deadline, status (active/completed/canceled) | ✅ | Metas financeiras |
| `installment_groups` | id, user_id, bank_account_id, description, total_amount, installment_count, installment_amount, first_date, source (import/manual) | ✅ | Grupos de compras parceladas |
| `recurring_rules` | id, user_id, bank_account_id, description, amount, type, frequency (weekly/biweekly/monthly/annual), start_date, end_date, next_due_date, status (active/paused/canceled) | ✅ | Padrões recorrentes |
| `scheduled_transactions` | id, user_id, bank_account_id, description, amount, type, due_date, status (pending/paid/overdue/canceled), recurring_rule_id, installment_group_id, paid_transaction_id | ✅ | Contas agendadas |
| `events` (analytics) | id, user_id, event_name, properties, created_at | ✅ | Analytics interno |

### Tabela `transactions` — todos os campos detalhados
```
id                   uuid         PK, gerado automaticamente
user_id              uuid         FK auth.users (RLS by equality)
bank_account_id      uuid         FK bank_accounts
external_id          text         ID OFX/banco ou "manual_{uuid}" (UNIQUE por conta)
date                 date         Data da transação (YYYY-MM-DD)
description          text         Descrição original do banco (max 255 chars)
amount               numeric      Valor absoluto (sempre positivo)
type                 text         'credit' ou 'debit'
category             text         Uma das 14 categorias predefinidas
category_source      text         'pending' | 'ai' | 'user' | 'cache'
category_confidence  numeric      0.0 a 1.0 (apenas quando category_source = 'ai')
created_at           timestamptz  Auto, default now()
updated_at           timestamptz  Auto-update via trigger update_updated_at()
```

**Campos ausentes (confirmado):** `notes`, `tags`, `receipt_url`, `is_favorite`, `merchant_name`, `location`

---

## Endpoints de API — Inventário Completo

| Método | Endpoint | Funcionalidade | Status |
|--------|----------|----------------|--------|
| GET | `/api/health` | Status de dependências (Supabase, Gemini, Asaas) | ✅ |
| POST | `/api/import` | Parse OFX/CSV + categorização + save | ✅ |
| POST | `/api/chat` | Streaming chat IA (Gemini) | ✅ |
| POST | `/api/audio` | Transcrição de áudio (Whisper/Groq) — Pro | ✅ |
| POST | `/api/checkout` | Iniciar checkout Asaas | ✅ |
| POST | `/api/checkout/cancel` | Cancelar assinatura | ✅ |
| POST | `/api/webhook/stripe` | Webhook de pagamentos (⚠️ arquivo = stripe, produto = Asaas) | ✅ |
| GET/POST | `/api/transactions` | Criar transação manual | ✅ |
| PATCH/DELETE | `/api/transactions/[id]` | Editar ou deletar transação | ✅ |
| GET/POST | `/api/budgets` | Listar e criar orçamentos | ✅ |
| PATCH/DELETE | `/api/budgets/[id]` | Editar ou deletar orçamento | ✅ |
| GET/POST | `/api/goals` | Listar e criar metas | ✅ |
| PATCH/DELETE | `/api/goals/[id]` | Editar ou deletar meta | ✅ |
| GET/POST | `/api/recurring` | Listar e criar regras recorrentes | ✅ |
| PATCH/DELETE | `/api/recurring/[id]` | Editar ou deletar regra | ✅ |
| POST | `/api/recurring/detect` | Detectar recorrentes automaticamente nos imports | ✅ |
| GET/POST | `/api/scheduled` | Listar e criar agendamentos | ✅ |
| PATCH/DELETE | `/api/scheduled/[id]` | Editar ou deletar agendamento | ✅ |
| POST | `/api/scheduled/[id]/pay` | Marcar agendamento como pago | ✅ |
| GET/POST | `/api/installment-groups` | Listar grupos de parcelas | ✅ |
| DELETE | `/api/installment-groups/[id]` | Deletar grupo de parcelas | ✅ |
| GET | `/api/cashflow` | Projeção de fluxo de caixa | ✅ |
| GET | `/api/user/export` | Exportar dados do usuário (LGPD) | ✅ |
| DELETE | `/api/user/account` | Excluir conta do usuário (LGPD) | ✅ |

---

## O que NÃO existe ainda

Comparado com `docs/market-research-features.md` — listando apenas o que **não existe** no codebase (sem UI, sem API, sem campo no banco de dados).

### Prioridade MVP (alto impacto, baixo esforço)
| Feature | Por que não está | Notas |
|---------|-----------------|-------|
| **Alertas de orçamento** (push/email quando ≥80%/100%) | ⬜ Não existe | `budgets` existe, mas sem notificação. Requer tabela `push_subscriptions` + Edge Function + service worker push |
| **Notificações push via PWA** | ⬜ Não existe | PWA instalável (`PwaInstallBanner`), mas sem service worker de push |
| **Notas em transações** | ⬜ Não existe | Sem campo `notes` na tabela `transactions`. Requer migration + UI inline |
| **Tags personalizadas** | ⬜ Não existe | Sem tabela `transaction_tags`. Requer migration + UI de tags |
| **Detecção de cobranças duplicadas** | ⬜ Não existe | SHA-256 existe para dedup de import, mas sem alerta ao usuário |
| **Detecção de sazonalidades BR** (IPVA, IPTU, 13o, IRPF) | ⬜ Não existe | Sem algoritmo de detecção sazonal |
| **Safe-to-spend card** ("posso gastar hoje?") | ⬜ Não existe | Mencionado no market research como FASE3, não está no codebase |
| **Bill reminders via push** (alerta antes do vencimento) | ⬜ Não existe | `UpcomingBillsCard` no dashboard é passivo; sem notificação proativa |
| **Saldo líquido como métrica standalone** | 🔶 Parcial | O `SummaryCards` já mostra saldo (receita−despesa), mas sem card dedicado "Saldo disponível hoje" |

### Prioridade Next (alto impacto, esforço médio)
| Feature | Por que não está |
|---------|-----------------|
| **Motor de regras de categorização** ("se descrição contém X → categoria Y") | ⬜ Existe `category_dictionary` mas sem UI de regras manuais |
| **Rastreamento de assinaturas** (card dedicado) | ⬜ `recurring_rules` existe, mas sem visão específica de assinaturas/períodicas |
| **Alerta de reajuste de assinatura** | ⬜ Sem comparativo histórico de valor para mesma descrição |
| **Score de saúde financeira** (0-100) | ⬜ Não existe |
| **Relatório mensal automático** (PDF/email) | ⬜ Não existe |
| **Categorização para IRPF** (exportar deduções) | ⬜ Não existe |
| **WhatsApp: notificações + consultas** | ⬜ Não existe |
| **Importação de fatura de cartão de crédito** | ⬜ Parsers existentes são para extratos; fatura tem estrutura diferente |
| **Net worth tracking** (evolução patrimonial) | ⬜ Não existe — mencionado como FASE3 |
| **Comparativo multi-período** (trimestre/ano — view dedicada) | 🔶 Parcial — `CategoryCards` tem tendência mês a mês, mas sem view trimestral/anual |
| **Previsão de gastos do próximo mês** | ⬜ Não existe |
| **Sugestão de economia por padrão de gastos** | ⬜ Não existe |
| **Detector de aumento de preço em assinaturas** | ⬜ Não existe |
| **Open Finance Brasil** (sync automático) | ⬜ Não existe |
| **Anexar comprovante/foto** em transação | ⬜ Não existe |

### Prioridade Futuro (médio impacto, esforço alto)
| Feature | Por que não está |
|---------|-----------------|
| **Modo família** (múltiplos usuários, orçamentos compartilhados) | ⬜ Schema é single-tenant por design |
| **Divisão de despesas** (rachar conta) | ⬜ Não existe |
| **Modo MEI/autônomo** (renda variável, DAS, nota fiscal) | ⬜ Não existe |
| **Reconciliação automática** (match entre manual e importado) | ⬜ Não existe |
| **Heatmap de gastos por dia** | ⬜ Não existe |
| **Gestão de dívidas** (snowball/avalanche) | ⬜ Não existe |
| **Cashback/benefícios não aproveitados** | ⬜ Não existe |

### Inconsistências encontradas no codebase
| Inconsistência | Localização | Nota |
|----------------|------------|------|
| Arquivo webhook chama "stripe" mas o produto usa Asaas | `src/app/api/webhook/stripe/route.ts` | Provável resquício de troca de gateway |
| Settings tab "Plano" busca `stripe_subscription_id` mas integração é Asaas | `src/app/(app)/settings/page.tsx:183` | Cancelamento pode estar quebrado |
| Landing page lista "Chat IA (20 msgs/dia)" para Pro, mas API tem 200/mês | `src/app/page.tsx` vs `src/lib/billing/plans.ts` | Inconsistência de copy |
| Landing page lista "3 contas" para Basic; API/planos dizem "1 conta" | `src/app/page.tsx` vs `src/lib/billing/plans.ts` | Copy da landing está desatualizado |

---

*Compilado por Atlas (@analyst) — Abril 2026*  
*Varredura direta do código-fonte: 24 API routes, 15+ pages, 50+ components, 13+ migrations SQL*

— Atlas, investigando a verdade 🔎
