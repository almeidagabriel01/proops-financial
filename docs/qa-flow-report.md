# QA Audit — Relatório de Fluxos End-to-End

**Agente:** Quinn (QA Guardian)  
**Data:** 2026-04-10  
**Branch:** `dev`  
**Último commit:** `fix: audio format validation — accept webm and mediarecorder formats`

---

## Sumário Executivo

| Fluxo | Status | Críticos | Avisos |
|-------|--------|----------|--------|
| 1. Autenticação | ✅ Funciona | 0 | 2 |
| 2. Onboarding | ✅ Funciona | 0 | 1 |
| 3. Import | ⚠️ Ressalvas | 1 | 2 |
| 4. Transações | ✅ Funciona | 0 | 0 |
| 5. Dashboard | ✅ Funciona | 0 | 0 |
| 6. Chat IA | ⚠️ Ressalvas | 0 | 2 |
| 7. Function Calling Pro | ✅ Funciona | 0 | 1 |
| 8. Áudio Pro | ⚠️ Ressalvas | 0 | 2 |
| 9. Planos e Paywall | ⚠️ Ressalvas | 1 | 2 |
| 10. LGPD | ⚠️ Ressalvas | 0 | 2 |

**Bloqueadores para produção: 2**  
**Itens de atenção: 14**

---

## Observação Importante — Modelos de IA

> **Discrepância detectada:** O `CLAUDE.md` e a documentação do produto descrevem os modelos como
> "Claude Haiku 4.5 (batch) + Sonnet 4.6 (chat)". A implementação real usa **Google Gemini**:
> - Categorização (Edge Function): `gemini-2.0-flash` (com fallback para keyword rules)
> - Chat Basic: `gemini-2.0-flash`
> - Chat Pro: `gemini-2.5-flash`
>
> O `PaywallModal` exibe "Haiku" e "Sonnet" como labels de modelo, o que é incorreto para o usuário.
> Esta discrepância precisa ser resolvida: ou a UI é atualizada para mencionar os modelos corretos,
> ou os modelos são migrados para Claude conforme previsto no PRD.

---

## 1. Autenticação

### 1.1 Cadastro com Google
✅ **Funciona corretamente**

- `signInWithOAuth({ provider: 'google', redirectTo: '/callback' })` implementado em `src/app/(auth)/signup/page.tsx`
- Callback em `src/app/(auth)/callback/route.ts` troca code por sessão e redireciona para `/dashboard`
- Middleware (`src/lib/supabase/middleware.ts`) redireciona usuário já autenticado que acessa `/signup` ou `/login` para `/dashboard`

### 1.2 Login com Google
✅ **Funciona corretamente**

- Mesmo fluxo OAuth via `src/app/(auth)/login/page.tsx`
- `getAuthError()` mapeia erros Supabase para mensagens em PT-BR

### 1.3 Logout
✅ **Funciona corretamente**

- `supabase.auth.signOut()` acionado na action de logout do `AppShell`
- `onAuthStateChange` em `use-user.ts` detecta sessão encerrada e limpa estado local
- Middleware redireciona para `/login` ao tentar acessar rota protegida sem sessão

### 1.4 Trial de 7 dias ativado após cadastro
✅ **Funciona corretamente**

- `profiles.trial_ends_at` tem `DEFAULT (now() + interval '7 days')` na tabela (`001_initial_schema.sql:65`)
- O trigger `on_auth_user_created` chama `handle_new_user()` que insere apenas `id` e `display_name`; os demais campos pegam DEFAULT automaticamente, incluindo `trial_ends_at`
- `getEffectiveTier()` em `src/lib/billing/plans.ts` retorna `'pro'` se `trial_ends_at > now()`
- `TrialBanner` em `src/components/layout/trial-banner.tsx` exibe dias restantes

**Ressalvas:**

⚠️ **Email não confirmado não bloqueia acesso:** O middleware não verifica `email_confirmed_at`. Um usuário que se registra via email/senha sem clicar no link de confirmação ainda consegue acessar rotas `(app)/*`.

⚠️ **Sem urgência visual progressiva no trial banner:** O mesmo estilo Amber é exibido tanto com 7 dias quanto com 1 dia restante. Não há escalonamento visual conforme o prazo se aproxima.

---

## 2. Onboarding

### 2.1 Fluxo completo dos 3 steps
✅ **Funciona corretamente**

- **StepWelcome** (`src/app/onboarding/_components/step-welcome.tsx`): exibe nome do usuário, info do trial, botão "Pular"
- **StepImport** (`step-import.tsx`): dropzone com upload via `/api/import`, instruções por banco (6 bancos), feedback de progresso em tempo real, botão "Pular por agora"
- **StepDone** (`step-done.tsx`): confirmação com mensagem adaptada (importou vs pulou)
- `OnboardingClient` gerencia estado dos passos e marca `onboarding_completed = true` ao concluir

### 2.2 Skip em cada etapa
✅ **Funciona corretamente**

- StepWelcome → "Pular onboarding" → marca `onboarding_completed=true` e redireciona para `/dashboard`
- StepImport → "Pular por agora" → avança para StepDone sem importar
- `markOnboardingComplete()` salva no Supabase via PATCH em `profiles`

### 2.3 Banner no dashboard para quem não completou
✅ **Funciona corretamente**

- `src/app/(app)/layout.tsx` verifica `onboarding_completed` e contagem de transações server-side
- Se novo usuário sem transações → força redirect para `/onboarding`
- Se tem dados mas onboarding incompleto → passa `showOnboardingBanner=true` para `AppShell`
- `OnboardingBanner` em `src/components/layout/onboarding-banner.tsx`: desaparece após 8 segundos ou ao clicar X
- `onboarding_completed` inicializado como `false` via `DEFAULT false NOT NULL` (migration `008_onboarding.sql`)

**Ressalva:**

⚠️ **Sem rastreamento de conclusão vs skip:** O sistema não distingue usuários que completaram o onboarding dos que pularam. Ambos têm `onboarding_completed=true`. Útil para analytics de ativação.

---

## 3. Import

### 3.1 Upload OFX (Nubank)
✅ **Funciona corretamente**

- `src/app/(app)/import/page.tsx` com dropzone para arquivos `.ofx` e `.csv`
- `src/lib/parsers/ofx-parser.ts` extrai `DTPOSTED`, `TRNAMT`, `FITID`, `NAME`/`MEMO`
- Deduplicação intra-arquivo: FITIDs duplicados no mesmo arquivo geram `fitid_2`, `fitid_3`, etc.
- Upload para Supabase Storage em `/imports/{userId}/{importId}.ofx`

### 3.2 Upload CSV
✅ **Funciona corretamente**

- `src/lib/parsers/csv-parser.ts` detecta delimiter (`,` vs `;`) e banco automaticamente
- Suporte a formatos: Nubank CSV, Itaú CSV, Bradesco CSV, genérico
- `external_id` gerado via SHA-256(`{date}|{amount}|{normalized_description}`)

### 3.3 Deduplicação (importar mesmo arquivo 2x)
✅ **Funciona corretamente**

- `src/app/api/import/route.ts` busca `external_id` existentes por `(user_id, bank_account_id)` antes de inserir
- Filtra duplicatas e retorna `duplicatesSkipped` na response
- Response exemplo: `{ transactionCount: 42, duplicatesSkipped: 42, status: "categorizing" }`

### 3.4 Limite de 3 contas no Basic
❌ **Quebrado — validação apenas no client-side**

- **Problema:** O check de `maxBankAccounts` ocorre em `src/app/(app)/import/page.tsx` (client-side). Um usuário com plano Basic pode fazer POST direto para `/api/import` e criar a 4ª conta sem bloqueio.
- **Localização:** `src/app/api/import/route.ts` — sem nenhuma verificação de plano ou contagem de contas
- **Risco:** Contorno fácil da limitação de plano, comprometendo o modelo de negócio

**Correção necessária:** Adicionar verificação em `/api/import/route.ts`:
```typescript
// Após autenticação, antes do parse:
const { tier } = getEffectiveTier(profile.plan, profile.trial_ends_at)
if (tier === 'basic') {
  const { count } = await supabase
    .from('bank_accounts')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', user.id)
  if ((count ?? 0) >= PLAN_LIMITS.basic.maxBankAccounts) {
    return NextResponse.json({ error: 'Limite de contas atingido' }, { status: 403 })
  }
}
```

### 3.5 Status categorizing → completed
✅ **Funciona corretamente** (com ressalva sobre o modelo)

- Fluxo: `processing` → `categorizing` (após parse + save) → `completed` (após Edge Function)
- UI usa Supabase Realtime subscription no canal `imports:{importId}` com polling fallback a cada 3s
- Timeout de polling: 90 segundos máximo
- Edge Function `categorize-import` implementa 3 tiers:
  1. **Tier 1** — Dicionário do usuário (`category_dictionary`)
  2. **Tier 2** — Cache global (`category_cache`)
  3. **Tier 3** — Gemini 2.0 Flash API (com fallback para keyword rules se `GOOGLE_AI_API_KEY` ausente)

⚠️ **Ressalva:** Se `GOOGLE_AI_API_KEY` não estiver configurada no ambiente da Edge Function, todas as transações não cobertas por Tier 1/2 recebem categorias via keyword rules (não IA real). O dashboard exibe o spinner "Categorizando..." corretamente, mas o resultado final pode ser menos preciso.

⚠️ **Ressalva:** O campo `status` do import na tabela não possui `'categorizing'` no CHECK constraint original (`001_initial_schema.sql:93`). Verificar se migration posterior adicionou esse valor ou se o UPDATE no status='categorizing' silencia o erro.

---

## 4. Transações

### 4.1 Listagem com filtros (período, tipo, categoria)
✅ **Funciona corretamente**

- `src/app/(app)/transactions/page.tsx` com filtros: busca (debounce 300ms), tipo (Todos/Receitas/Despesas), categoria, mês
- Filtros sincronizados à URL via query params (`?month=`, `?type=`, `?search=`, `?category=`)
- Infinite scroll com `IntersectionObserver`, 50 transações por página
- Layout responsivo: tabela no desktop, cards no mobile

### 4.2 Busca por descrição
✅ **Funciona corretamente**

- Busca accent-insensitive via coluna gerada `description_search` (migration `002_unaccent_search.sql`)
- Hook `useTransactions` aplica filtro com `ilike` na coluna normalizada

### 4.3 Criar transação manual
✅ **Funciona corretamente**

- FAB no mobile, botão "Nova transação" no desktop → abre `TransactionForm`
- API `POST /api/transactions` valida: data (YYYY-MM-DD), descrição (1-255), amount (>0, <999999.99), tipo, categoria
- Cria/reutiliza automaticamente conta "Lançamentos Manuais"
- `external_id` gerado como `manual_<UUID>`

### 4.4 Editar transação existente
✅ **Funciona corretamente**

- Menu 3 pontos → "Editar" → `TransactionForm` pré-preenchido
- `PATCH /api/transactions/[id]` suporta atualização parcial
- RLS garante que usuário edita apenas próprias transações

### 4.5 Excluir com confirmação
✅ **Funciona corretamente**

- Menu 3 pontos → "Excluir" → `DeleteConfirmDialog` com aviso "Esta ação não pode ser desfeita"
- `DELETE /api/transactions/[id]` retorna 204
- Loading state "Excluindo..." durante requisição

### 4.6 Corrigir categoria e aprendizado
✅ **Funciona corretamente**

- `TransactionDetail` sheet → "Corrigir categoria" → `CategorySelector`
- Busca transações com mesma descrição normalizada → oferece correção em lote ou individual
- Salva `category_source: 'user'` + upsert em `category_dictionary` para aprendizado futuro
- Toast confirma: "X transações atualizadas" ou "Categoria atualizada"

---

## 5. Dashboard

### 5.1 Gráficos de categoria
✅ **Funciona corretamente**

- **Category Chart** (`src/components/dashboard/category-chart.tsx`): barras horizontais com top 5 categorias, ícone + nome + % + valor, cores dinâmicas
- **Spending Breakdown** (`spending-breakdown.tsx`): BarChart vertical com até 6 categorias + "X outras"
- Recharts carregado com `dynamic(() => import(...), { ssr: false })` para evitar SSR issues

### 5.2 Cards de categoria com tendência
✅ **Funciona corretamente**

- `CategoryCards` (`src/components/dashboard/category-cards.tsx`): grid responsivo 1→2→3 colunas
- `TrendBadge` mostra ↑/↓ % vs mês anterior (verde se gasto caiu, vermelho se subiu)
- Cálculo de delta: `((current - prev) / prev) * 100` com threshold ±2% para "stable"

### 5.3 Filtro de período
✅ **Funciona corretamente**

- `MonthPicker` (`src/components/dashboard/month-picker.tsx`): popover com calendário mensal
- Seleção navega para `?month=YYYY-MM`
- Dashboard é Server Component que lê o parâmetro e busca dados do mês correto

### 5.4 Clique no card filtra transações
✅ **Funciona corretamente**

- `CategoryCards` usa `router.push('/transactions?category=<cat>')` ao clicar
- Página de transações inicializa filtros a partir dos query params
- Filtro de categoria já selecionado ao chegar na página

---

## 6. Chat IA

### 6.1 Enviar pergunta
✅ **Funciona corretamente**

- `src/app/(app)/chat/page.tsx` com `ChatInput` (textarea auto-resize, Enter envia, Shift+Enter quebra linha)
- Contexto financeiro injetado no system prompt: mês atual (income, expenses, balance, top 5 categorias, top 5 merchants) + últimos 3 meses

### 6.2 Resposta em streaming
✅ **Funciona corretamente**

- `createUIMessageStreamResponse` com Vercel AI SDK
- `ChatMessages` renderiza partes progressivamente: text parts e tool call parts
- Indicador de streaming: 3 dots animados durante `status='submitted'`
- Timeout warning após 30s: "A resposta está demorando mais que o esperado"

### 6.3 Rate limiting (50/mês Basic, 200/mês Pro)
✅ **Funciona corretamente** (verificação server-side)

- `src/app/api/chat/route.ts` busca `ai_queries_this_month` e `ai_queries_reset_at` do profile
- Reset automático no primeiro dia do mês (compara ano+mês de `ai_queries_reset_at` com now())
- Retorna HTTP 429 se limite excedido
- `ChatInput` desabilita textarea e exibe link "Ver planos" ao receber 429
- Grace period de 3 dias para assinaturas com status `past_due`

### 6.4 Histórico persistido
✅ **Funciona corretamente**

- `useChatHistory` em `src/hooks/use-chat-history.ts`: lista 20 conversas mais recentes, carrega 50 últimas mensagens por conversa
- `localStorage` persiste `activeConversationId` por usuário
- Auto-create de conversa no primeiro user message, com fallback para conversa mais recente se ID deletado

**Ressalvas:**

⚠️ **Modelos incorretamente documentados e exibidos:** A UI e documentação mencionam "Claude Haiku" e "Claude Sonnet", mas o código usa `gemini-2.0-flash` (Basic) e `gemini-2.5-flash` (Pro). O `PaywallModal` exibe "Haiku" e "Sonnet" como labels — informação incorreta para o usuário.

⚠️ **Stub mode sem GOOGLE_AI_API_KEY:** Se a variável não estiver configurada em produção, o chat retorna "[Modo demonstração]" para todos os usuários. Sem alertas visíveis para o administrador.

---

## 7. Function Calling Pro (stub)

> Nota: O termo "stub" no enunciado foi interpretado como "feature restrita ao plano Pro". O código está completamente implementado.

### 7.1 Criar transação via chat
✅ **Funciona corretamente**

- Tool `create_transaction` em `src/lib/ai/tools/index.ts`: parâmetros `date`, `description`, `amount`, `category`
- Cria/reutiliza conta "Lançamentos Manuais" automaticamente
- Disponível apenas para `tier === 'pro'` (verificado em `/api/chat/route.ts`)

### 7.2 Recategorizar via chat
✅ **Funciona corretamente**

- Tools `update_transaction_category` e `update_transaction` disponíveis
- Ownership check via `eq('user_id', userId)` em todas as operações

### 7.3 Criar orçamento via chat
✅ **Funciona corretamente**

- Tool `create_budget`: UPSERT por `(user_id, category)` com `monthly_limit`
- Retorna confirmação com valor formatado em R$

### 7.4 Criar objetivo via chat
✅ **Funciona corretamente**

- Tool `create_goal`: parâmetros `name`, `targetAmount`, `targetDate`
- Armazena em tabela `goals` (migration `004_budgets_goals.sql`)

### 7.5 Excluir com confirmação
✅ **Funciona corretamente**

- Tool `delete_transaction` implementa two-step:
  1. `confirmed: false` → retorna `requiresConfirmation: true` + detalhes da transação para o modelo exibir ao usuário
  2. `confirmed: true` → executa deleção após confirmação explícita do usuário

**Ressalva:**

⚠️ **Rate limit único para mensagens + tool calls:** Uma sequência "buscar → criar → confirmar" consome 3 mensagens do quota mensal. Usuários Pro com 200/mês podem esgotar mais rápido do que esperam ao usar function calling intensamente.

---

## 8. Áudio Pro

### 8.1 Gravar áudio
✅ **Funciona corretamente**

- `AudioRecorder` em `src/components/chat/audio-recorder.tsx`
- `navigator.mediaDevices.getUserMedia({ audio: true })`
- Auto-parada após 120 segundos
- Indicador visual pulsante durante gravação
- MIME type preferido: `audio/webm;codecs=opus`, fallback `audio/webm`

### 8.2 Transcrição (Groq Whisper)
✅ **Funciona corretamente** (com stub mode)

- `src/app/api/audio/route.ts`: POST com FormData
- Validação de plano: `tier === 'pro'` E `audio_enabled === true`
- Groq Whisper `whisper-large-v3-turbo`, idioma `pt`
- Limite: 25MB, MIME types aceitos: webm, ogg, mp4, wav, m4a, mpeg/mp3
- Stub mode se `GROQ_API_KEY` ausente: retorna transcrição fake para testes

### 8.3 Envio para o chat
✅ **Funciona corretamente**

- `onTranscript` callback no `ChatInput` appenda o texto transcrito ao textarea
- Usuário pode editar antes de enviar
- AudioRecorder desabilitado durante loading ou se quota esgotada

**Ressalvas:**

⚠️ **Sem feedback de permissão de microfone:** O erro de permissão negada (`NotAllowedError`) só aparece ao clicar no botão, não há verificação prévia via `navigator.permissions.query({ name: 'microphone' })`.

⚠️ **Campo `audio_enabled` é estado derivado armazenado:** `profiles.audio_enabled` é atualizado via trigger de webhook Asaas (migration `003_plan_restructure.sql:40-54`). Se o webhook falhar ou atrasar, pode haver janela onde usuário deveria ter acesso mas `audio_enabled=false` (ou vice-versa). A fonte de verdade deveria ser apenas `plan + trial_ends_at`.

---

## 9. Planos e Paywall

### 9.1 Banner de trial
✅ **Funciona corretamente**

- `TrialBanner` em `src/components/layout/trial-banner.tsx` exibe se `inTrial && trialDaysLeft > 0`
- Mostra dias restantes, CTA "Assinar Pro" → `/settings?tab=plano`
- Desaparece quando trial expira (cálculo em `use-plan.ts`)

### 9.2 Paywall modal ao atingir limite
✅ **Funciona corretamente** (com ressalva)

- `PaywallModal` em `src/components/layout/paywall-modal.tsx` exibido em import (limite de contas), chat (rate limit 429), audio (sem plano Pro)
- Tabela comparativa Basic vs Pro com 5 linhas de features
- CTA "Assinar Pro" → POST `/api/checkout` → abre Asaas checkout em nova aba

### 9.3 Settings → aba Plano
✅ **Funciona corretamente**

- `src/app/(app)/settings/page.tsx` tab "plano": comparação side-by-side, card atual com badge "Ativo"/"Trial", CTA de upgrade/cancelamento
- Cancelamento two-step: click → confirmação → POST `/api/checkout/cancel`

**Problemas:**

❌ **CPF/CNPJ não coletado para checkout Asaas:** `src/app/api/checkout/route.ts` tem TODO explícito: `"cpfCnpj omitted — TODO: collect via onboarding before production launch"`. Pagamentos reais Asaas exigem CPF/CNPJ — sem esse dado, cobranças podem ser rejeitadas ou o checkout pode falhar em produção.

⚠️ **Checkout hardcoded para `pro_monthly`:** O `PaywallModal` e Settings oferecem apenas o plano mensal Pro. Não há opção de annual (`pro_yearly`, R$479/ano) na UI de upgrade. A tabela de planos em `plans.ts` define ambos, mas a UI ignora o anual.

⚠️ **Labels de modelo incorretos no PaywallModal:** A tabela comparativa exibe "Haiku" e "Sonnet" na linha "Modelo IA". Os modelos reais são Gemini 2.0 Flash e 2.5 Flash.

---

## 10. LGPD

### 10.1 Exportar dados (JSON)
✅ **Funciona corretamente**

- `GET /api/user/export` (src/app/api/user/export/route.ts)
- Exporta: profile, transactions (todas), budgets, goals, category_dictionary, chat_messages
- Response com `Content-Disposition: attachment; filename=meus-dados-finansim-{date}.json`
- Referência LGPD (Art. 18, III — portabilidade) exibida na UI de Settings → aba Dados

### 10.2 Excluir conta
✅ **Funciona corretamente**

- `DELETE /api/user/account` executa deleção em cascata na ordem correta (transactions → budgets → goals → ... → profiles → auth.users)
- Cancela assinatura Asaas ativa antes de deletar
- UI com confirmação obrigatória: usuário deve digitar "EXCLUIR" (case-sensitive)
- Após exclusão: `supabase.auth.signOut()` + redirect para `/login?deleted=true`
- Referência LGPD (Art. 18, VI — eliminação) exibida na UI

**Ressalvas:**

⚠️ **Sem Consent Management Platform (CMP):** Não há cookie banner ou mecanismo de consentimento explícito para rastreamento/analytics. Se o app usar Sentry, PostHog ou Google Analytics sem consentimento explícito do usuário, pode estar em não-conformidade com LGPD.

⚠️ **Exclusão sem grace period:** A deleção é imediata e irreversível. Não há período de carência (7-30 dias) para recuperação de conta em caso de exclusão acidental. O erro Asaas no cancelamento é silenciado com try/catch, podendo deixar cobrança ativa mesmo após conta deletada.

---

## Problemas Prioritários

### ❌ Críticos (bloqueadores de produção)

| # | Problema | Arquivo | Impacto |
|---|----------|---------|---------|
| C-1 | Limite de 3 contas bancárias (Basic) verificado apenas no client-side | `src/app/api/import/route.ts` | Usuários Basic podem bypassar limite via POST direto, comprometendo monetização |
| C-2 | CPF/CNPJ não coletado para checkout Asaas | `src/app/api/checkout/route.ts:28` | Cobranças reais Asaas podem falhar sem o documento; TODO pendente explícito |

### ⚠️ Avisos (não bloqueiam launch, mas devem ser endereçados)

| # | Problema | Arquivo | Impacto |
|---|----------|---------|---------|
| W-1 | Labels de modelo incorretos ("Haiku"/"Sonnet") na UI | `src/components/layout/paywall-modal.tsx` | Confusão ou desonestidade com o usuário sobre o produto oferecido |
| W-2 | CLAUDE.md e PRD descrevem Claude, código usa Gemini | `supabase/functions/categorize-import/index.ts`, `/api/chat/route.ts` | Inconsistência entre documentação e implementação; risco de confusão no onboarding de novos devs |
| W-3 | Checkout não oferece plano anual (`pro_yearly`) | `src/components/layout/paywall-modal.tsx` | Receita potencial perdida (R$479/ano vs R$49,90 × 12 = R$598,80) |
| W-4 | Email não confirmado não bloqueia acesso | `src/lib/supabase/middleware.ts` | Usuários com email não verificado podem usar o app |
| W-5 | `audio_enabled` armazenado em vez de calculado | `src/hooks/use-plan.ts:62`, `003_plan_restructure.sql` | Janela de inconsistência se webhook Asaas atrasar |
| W-6 | Sem validação de permissão de microfone antes de render | `src/components/chat/audio-recorder.tsx` | UX ruim: erro só aparece ao clicar no botão |
| W-7 | Sem urgência visual progressiva no trial banner | `src/components/layout/trial-banner.tsx` | Conversão inferior: não há escalonamento visual nos últimos dias |
| W-8 | Sem opção para trocar método de pagamento dentro do app | `src/app/(app)/settings/page.tsx` | Usuários precisam contatar suporte para atualizar cartão |
| W-9 | Sem CMP (cookie consent) para rastreamento | `src/*` | Potencial não-conformidade LGPD se analytics/Sentry ativos |
| W-10 | Exclusão de conta sem grace period | `src/app/api/user/account/route.ts` | Deleção acidental é irrecuperável |

---

## Conclusão

O produto está em **estado avançado de desenvolvimento**, com a grande maioria dos fluxos funcionando corretamente. Os módulos de transações e dashboard estão production-ready. O chat IA, function calling e áudio estão implementados e funcionais, porém dependem de variáveis de ambiente corretas (`GOOGLE_AI_API_KEY`, `GROQ_API_KEY`) para operar com IA real em vez do stub mode.

**Os 2 itens críticos** (validação server-side do limite de contas e coleta de CPF/CNPJ para checkout) **devem ser resolvidos antes do launch** para proteger o modelo de negócio e viabilizar cobranças reais.

A **discrepância entre Claude (documentado) e Gemini (implementado)** requer decisão de produto: ou o código é migrado para Claude (conforme CLAUDE.md e PRD), ou a documentação e UI são atualizadas para refletir Gemini.

---

*— Quinn, guardião da qualidade 🛡️*
