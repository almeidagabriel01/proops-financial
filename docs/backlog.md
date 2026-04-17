# Backlog — Features Pendentes

Features identificadas mas fora do escopo dos Epics 1–4 do MVP.
Cada item lista o Epic mais adequado para inclusão e a prioridade de negócio.

---

## Cadastro Manual de Transação

**Prioridade:** Alta
**Epic sugerido:** Epic 1 (Foundation) — extensão da Story 1.4
**Descrição:** Usuário cria uma transação manualmente (sem importar extrato). Necessário para despesas pagas em dinheiro, reembolsos, e entradas não registradas pelo banco.

**Escopo mínimo:**
- Formulário: data, descrição, valor, tipo (débito/crédito), categoria
- `external_id` gerado como `manual_{uuid}` (distingue de OFX/CSV)
- Transação manual não participa do dedup por FITID/SHA-256
- IA categoriza automaticamente ao salvar (Tier 1/2 → Haiku se necessário)

**Por que Alta:** Sem isso, usuários com despesas em dinheiro têm dados incompletos no dashboard, reduzindo utilidade do produto.

---

## Receita Recorrente (Detecção Automática)

**Prioridade:** Média
**Epic sugerido:** Epic 2 (IA) — extensão pós-Story 2.1/2.2
**Descrição:** Detectar automaticamente transações recorrentes (salário mensal, aluguel recebido, freelances periódicos) e marcá-las como recorrentes no dashboard.

**Escopo mínimo:**
- Algoritmo: transações com mesma descrição normalizada, mesmo valor ±5%, periodicidade ≥ 28 dias
- Campo `is_recurring boolean` na tabela `transactions`
- Dashboard: badge "Recorrente" nas transações detectadas
- Sem UI de cadastro manual de recorrência no MVP

**Por que Média:** Melhora a experiência de usuários com renda estável, mas o produto funciona sem isso.

---

## Projeções Financeiras Futuras

**Prioridade:** Média
**Epic sugerido:** Epic 3 (Premium Chat) — feature exclusiva Pro
**Descrição:** Projetar saldo e gastos para os próximos 30/60/90 dias baseado em histórico e transações recorrentes detectadas.

**Escopo mínimo:**
- Requer "Receita Recorrente" implementada (dependência)
- Cálculo server-side: média de gastos por categoria (últimos 3 meses) + recorrentes confirmados
- Exibição: gráfico de linha simples (saldo projetado vs real)
- Exclusivo para usuários Pro (via `getEffectiveTier`)
- Disponível como function call no chat IA Pro

**Por que Média:** Feature diferenciadora para retenção Pro, mas requer dados históricos suficientes para ser útil.

---

## Antecipações e Compromissos Futuros

**Prioridade:** Baixa
**Epic sugerido:** Epic 4 (Polish) ou Epic 5 futuro
**Descrição:** Usuário registra compromissos futuros (boleto a vencer, parcela de cartão, IPVA parcelado) que ainda não aparecem no extrato. Permite planejamento de caixa.

**Escopo mínimo:**
- Nova tabela `commitments` (data_vencimento, descrição, valor, categoria, recorrente)
- UI: tela de compromissos (separada de transações)
- Dashboard: seção "A pagar" com soma de compromissos dos próximos 30 dias
- Sem integração com extrato (commitments são manuais)

**Por que Baixa:** Aumenta complexidade de UX significativamente. Usuários do MVP provavelmente priorizam entender o passado antes de planejar o futuro. Candidato a Epic 5.

---

## Resumo de Priorização

| Feature | Prioridade | Epic | Dependências |
|---------|-----------|------|-------------|
| Cadastro manual de transação | Alta | Epic 1 ext. | Nenhuma |
| Receita recorrente (detecção) | Média | Epic 2 ext. | Nenhuma |
| Projeções financeiras | Média | Epic 3 | Receita recorrente |
| Antecipações e compromissos | Baixa | Epic 4/5 | Nenhuma |

---

## Tech Debt — Story C1.2 (Tags Personalizadas)

### C1.2-mn1 — TransactionDetail não limita exibição a 10 tags

**Prioridade:** Baixa
**Origem:** Story C1.2 mn-pós-1 (QA Review 2026-04-13)
**Arquivo:** `src/components/transactions/transaction-detail.tsx`
**Descrição:** AC3 especifica "se > 10 tags, exibir '...' e número total". A implementação exibe todas as tags sem truncamento no sheet de detalhe. Pode causar layout crescendo indefinidamente para usuários com muitas tags.
**Fix:** Condicional no render: `tags.slice(0, 10)` + badge `+N` quando `tags.length > 10`.

---

### C1.2-mn2 — Seção Tags exibida antes das Notas (ordem invertida)

**Prioridade:** Baixa
**Origem:** Story C1.2 mn-pós-2 (QA Review 2026-04-13)
**Arquivo:** `src/components/transactions/transaction-detail.tsx`
**Descrição:** AC3 especifica "seção 'Tags' abaixo da seção de nota". Implementação renderiza Tags (linha 337) antes de Nota (linha 401). Sem impacto funcional.
**Fix:** Inverter a ordem dos blocos JSX — mover seção de Tags para após a seção de Nota.

---

### C1.2-mn3 — POST /api/transactions/[id]/tags retorna shape incompleto

**Prioridade:** Baixa
**Origem:** Story C1.2 mn-pós-3 (QA Review 2026-04-13)
**Arquivo:** `src/app/api/transactions/[id]/tags/route.ts`
**Descrição:** AC2 especifica retorno `{ id, transaction_id, tag, created_at }`. Implementação retorna apenas `{ tag }`. Frontend não consome os campos extras (adiciona otimisticamente), sem quebra funcional. Divergência do contrato de API.
**Fix:** Após upsert, fazer SELECT do registro inserido e retornar shape completo.

---

### C1.2-mn4 — Rollback do add tag usa closure stale (concorrência)

**Prioridade:** Baixa
**Origem:** Story C1.2 mn-pós-4 (QA Review 2026-04-13)
**Arquivo:** `src/components/transactions/transaction-detail.tsx` — `handleAddTag()`
**Descrição:** `tags.filter((t) => t !== tag)` usa o valor de `tags` capturado no closure. Se o usuário adicionar duas tags em rápida sucessão e a primeira falhar, o rollback pode descartar a segunda adição.
**Fix:** Usar functional update: `setTags(prev => prev.filter(t => t !== tag))` e `setTags(prev => [...prev, tag])`.

---

### C1.2-mn5 — Autocomplete com `q` usa limite 20 em vez de 10

**Prioridade:** Baixa
**Origem:** Story C1.2 mn-pós-5 (QA Review 2026-04-13)
**Arquivo:** `src/app/api/tags/autocomplete/route.ts`
**Descrição:** AC2 especifica "Limite: 10 resultados" para busca com prefixo `q`, "20 tags mais usadas" para `q` omitido. Implementação usa `.slice(0, 20)` em ambos os casos.
**Fix:** `const limit = prefix ? 10 : 20; .slice(0, limit)`.

---

## Tech Debt — Migração Asaas → Stripe (CPF/CNPJ e plano anual)

**Prioridade:** Alta (pré-launch)
**Origem:** Auditoria QA 2026-04-10 (C-2 + M3)
**Descrição:** Dois itens bloqueadores serão resolvidos na migração para Stripe:

1. **CPF/CNPJ:** Asaas exige CPF/CNPJ para cobranças reais. A coleta desse dado não foi implementada no onboarding. Na migração para Stripe, o gateway não exige CPF/CNPJ, eliminando o problema.

2. **Plano anual:** O checkout atual é hardcoded para `pro_monthly`. A tabela `PLANS` já define `pro_yearly` (R$479/ano ≈ 2 meses grátis). A UI de upgrade deve expor a opção anual. Será implementado junto com a integração Stripe.

**Status:** Aguardando decisão de migração de gateway de pagamento.

---

## Tech Debt — usage_count no category_dictionary

**Prioridade:** Baixa
**Epic sugerido:** Epic 2 ext. (pós-MVP)
**Origem:** Story 2.2 m2 (QA Review 2026-04-07)
**Descrição:** `saveCorrection()` sempre envia `usage_count: 1` no upsert do `category_dictionary`. O Supabase JS substitui o campo no conflito em vez de incrementar. O AC3 da Story 2.2 especifica `usage_count=usage_count+1`.

**Fix necessário:** Criar RPC `increment_category_usage(user_id, description_pattern, category)` que execute o UPDATE com `usage_count = usage_count + 1` no banco e chamá-la em substituição ao upsert direto, ou executar o incremento via SQL raw.

**Impacto atual:** Baixo — a contagem de uso não é exibida para o usuário nem influencia decisões de categorização no MVP. O dicionário funciona corretamente para lookup (Tier 1); apenas o contador fica incorreto.

---

## Tech Debt — Story C1.5 (Detecção de Cobranças Duplicadas)

### C1.5-mn1 — Extra round-trip de DB no fire-and-forget (Etapa 7.5)

**Prioridade:** Baixa
**Origem:** Story C1.5 mn1 (QA Review 2026-04-13)
**Arquivo:** `src/app/api/import/route.ts` — Etapa 7.5
**Descrição:** O IIFE de detecção re-busca IDs das transações por `import_id` em vez de usar IDs já disponíveis. A razão técnica é que o insert não usa `.select()`, então os IDs atribuídos pelo banco não ficam disponíveis localmente. Adiciona 1 query extra por importação.
**Fix:** Adicionar `.select('id')` ao insert de transações na Etapa 6 e passar os IDs diretamente ao `detectDuplicates`.

---

### C1.5-mn2 — Limite inconsistente entre GET /api/duplicate-alerts e query do dashboard

**Prioridade:** Baixa
**Origem:** Story C1.5 mn2 (QA Review 2026-04-13)
**Arquivo:** `src/app/api/duplicate-alerts/route.ts` e `src/app/(app)/dashboard/page.tsx`
**Descrição:** `GET /api/duplicate-alerts` retorna até 10 alertas; query do dashboard usa `.limit(5)`. Não causa inconsistência funcional (dashboard faz query direta), mas a divergência pode confundir em testes futuros.
**Fix:** Alinhar ambos para o mesmo valor (sugestão: 5, já que o card exibe no máximo 3).

---

### C1.5-mn3 — `(supabase as any)` em duplicate_alerts até regenerar tipos

**Prioridade:** Baixa
**Origem:** Story C1.5 mn3 (QA Review 2026-04-13)
**Arquivo:** `src/app/api/duplicate-alerts/route.ts`, `src/app/api/duplicate-alerts/[id]/route.ts`, `src/app/(app)/dashboard/page.tsx`
**Descrição:** Tabela `duplicate_alerts` não está em `types.ts` (requer `supabase gen types` com instância rodando). Segue padrão existente de `scheduled_transactions`.
**Fix:** Rodar `supabase gen types typescript --local > src/lib/supabase/types.ts` após aplicar a migration em ambiente local.

---

## Tech Debt — Story C1.6 (Detecção de Sazonalidades BR)

### C1.6-mn1 — `getSeasonalityEstimate` omite campo `yearMonth` do contrato de AC2

**Prioridade:** Baixa
**Origem:** Story C1.6 mn1 (QA Review 2026-04-13)
**Arquivo:** `src/lib/dashboard/seasonalities.ts` — `getSeasonalityEstimate`
**Descrição:** AC2 especifica retorno `{ total, transactionCount, yearMonth: string }`. A implementação retorna apenas `{ total, transactionCount }`. Campo não é consumido em lugar algum atualmente, sem impacto funcional. Se `yearMonth` for necessário futuramente (ex: exibir "você gastou R$X em fevereiro/2025"), exigirá adição retroativa.
**Fix:** Adicionar `yearMonth: \`${referenceYear}-${String(months[0]).padStart(2, '0')}\`` ao retorno.

---

### C1.6-mn2 — CTA de sazonalidade multi-mês aponta apenas ao mês visualizado

**Prioridade:** Baixa
**Origem:** Story C1.6 mn2 (QA Review 2026-04-13)
**Arquivo:** `src/components/dashboard/seasonality-card.tsx`
**Descrição:** Para sazonalidades multi-mês (IRPF: meses 3-4, férias: 6-7), o link CTA usa `lastYearMonth` baseado no mês atualmente visualizado. Ao visualizar abril 2026, o link vai para `/transactions?month=2025-04&search=irpf`, mas as transações de março/2025 ficam inacessíveis pelo link. Aceitável para MVP.
**Fix:** Para multi-mês, gerar links para todos os meses da sazonalidade, ou usar apenas o período mais comum (ex: primeiro mês da sazonalidade).

---

### C1.6-mn3 — Keywords com acento não casam com extratos bancários em ASCII

**Prioridade:** Baixa
**Origem:** Story C1.6 mn3 (QA Review 2026-04-13)
**Arquivo:** `src/lib/dashboard/seasonalities.ts` — `BRAZIL_SEASONALITIES`
**Descrição:** Keywords `'veículo'`, `'matrícula'`, `'férias'`, `'confraternização'` não correspondem a descrições de extratos que usam ASCII sem acentuação (ex: "VEICULO CRLV SP", "MATRICULA ESCOLA", "FERIAS HOTEL"). Cada sazonalidade tem outras keywords sem acento que compensam na maioria dos casos, mas a cobertura é parcial.
**Fix:** Adicionar variantes sem acento às keyword lists (`'veiculo'`, `'matricula'`, `'ferias'`, `'confraternizacao'`) ou implementar normalização de acento na função `getSeasonalityEstimate`.

---

## Tech Debt — Story C1.7 (Safe-to-Spend Card)

### C1.7-mn1 — `hasData=false` branch em `SafeToSpendCard` é código morto

**Prioridade:** Baixa
**Origem:** Story C1.7 mn1 (QA Review 2026-04-13)
**Arquivo:** `src/components/dashboard/safe-to-spend-card.tsx` (linha 74), `src/app/(app)/dashboard/page.tsx` (linha 202)
**Descrição:** O card só renderiza dentro do bloco `{hasData ? <> ... </> : <DashboardEmptyState/>}`. O prop `hasData` passado ao componente será sempre `true` quando o card renderizar — o branch `!hasData` (que exibe "Importe seu extrato para ativar este card") é inalcançável. AC5 especifica essa mensagem, mas o `DashboardEmptyState` já cobre o caso de usuário sem dados.
**Fix:** Remover o branch `!hasData` do componente ou mover o `SafeToSpendCard` para fora do guard `hasData` e deixar o componente tratar ambos os casos.

---

### C1.7-mn2 — `safeToSpend === 0` dispara alerta "despesas superam receitas"

**Prioridade:** Baixa
**Origem:** Story C1.7 mn2 (QA Review 2026-04-13)
**Arquivo:** `src/components/dashboard/safe-to-spend-card.tsx` (linha 20)
**Descrição:** `isNegative = safeToSpend <= 0` inclui o caso exato zero. Quando `income = expenses + pendingTotal`, o card exibe vermelho com "Atenção: despesas superam receitas neste mês" — texto tecnicamente inacurado quando o saldo é exatamente zero.
**Fix:** Alterar para `isNegative = safeToSpend < 0` para reservar o alerta a déficits reais. Tratar `safeToSpend === 0` com cor âmbar e texto neutro ("Seu saldo disponível é zero este mês").

---

### C1.7-mn3 — Query de contas pendentes sem filtro de data mínima

**Prioridade:** Baixa
**Origem:** Story C1.7 mn3 (QA Review 2026-04-13)
**Arquivo:** `src/app/(app)/dashboard/page.tsx` (linhas 114-119)
**Descrição:** A query usa apenas `.lte('due_date', endOfCurrentMonth)` sem `.gte('due_date', startOfToday)`. Contas com `due_date` em meses anteriores que permanecem em `status = 'pending'` (não pagas, não canceladas) são incluídas no `pendingTotal`, inflando o cálculo. A nota técnica do spec incluía o filtro `gte` para evitar esse cenário.
**Fix:** Adicionar `.gte('due_date', new Date().toISOString().slice(0, 10))` ao query de pending bills, ou usar a data de início do mês visualizado como lower bound.

---

*Última atualização: 2026-04-13*

---

## Tech Debt — Story C1.4 (Alertas de Orçamento)

### C1.4-mn1 — `NEXT_PUBLIC_APP_URL` ausente queima log entry sem entregar push

**Prioridade:** Média
**Origem:** Story C1.4 mn1 (QA Review 2026-04-13)
**Arquivo:** `supabase/functions/check-budget-alerts/index.ts` (linha 65)
**Descrição:** Se `NEXT_PUBLIC_APP_URL` não estiver nas secrets da Edge Function, `appUrl = ''`. Em Deno, `fetch('')` lança `TypeError: Invalid URL` — capturado pelo try/catch — mas o `budget_alert_log` já foi inserido (TOCTOU insert-first). A unique constraint `(budget_id, threshold, month)` impede reenvio no mesmo mês. Resultado: alerta não entregue e sem possibilidade de retry.
**Fix:** Validar `NEXT_PUBLIC_APP_URL` no início do handler. Se ausente, retornar 500 sem inserir logs — evita queimar entries:
```typescript
const appUrl = Deno.env.get('NEXT_PUBLIC_APP_URL');
if (!appUrl) {
  console.error('[check-budget-alerts] NEXT_PUBLIC_APP_URL não configurado');
  return new Response(JSON.stringify({ error: 'NEXT_PUBLIC_APP_URL not set' }), { status: 500 });
}
```

---

### C1.4-mn2 — Import trigger pode rodar antes da categorização terminar

**Prioridade:** Baixa
**Origem:** Story C1.4 mn2 (QA Review 2026-04-13)
**Arquivo:** `src/app/api/import/route.ts` (Etapa 7.6)
**Descrição:** `categorize-import` (Etapa 7) e `check-budgets` (Etapa 7.6) são acionados fire-and-forget simultaneamente. As novas transações estão salvas com `category = 'outros'` no momento em que `check-budgets` roda. `get_category_spending` filtra por categoria — não computa transações recém-importadas ainda não categorizadas. O alerta pós-import pode ser impreciso. O cron diário (08h) avalia corretamente pois a categorização já terminou.
**Fix (opcional):** Mover o trigger do import para dentro da Edge Function `categorize-import`, acionado ao final — após o update das categorias. Ou adicionar delay de 30s no trigger do import para dar tempo à categorização.

---

*Última atualização: 2026-04-13*

---

## Tech Debt — Story 4.4 (PWA & Performance)

### M1 — PWAInstallBanner usa sessionStorage para dismissal

**Prioridade:** Baixa
**Origem:** Story 4.4 M1 (QA Review 2026-04-07)
**Arquivo:** `src/components/layout/pwa-install-banner.tsx`
**Descrição:** `DISMISSED_KEY` armazenado em `sessionStorage` — ao fechar e reabrir o browser o banner reaparece, mesmo que o usuário já tenha dispensado. `localStorage` seria mais adequado para dismissal permanente e experiência não-intrusiva.
**Fix:** Trocar `sessionStorage` por `localStorage` para o `DISMISSED_KEY`.

---

### M2 — SW disable usa `=== 'development'` em vez de `!== 'production'`

**Prioridade:** Baixa
**Origem:** Story 4.4 M2 (QA Review 2026-04-07)
**Arquivo:** `next.config.ts`
**Descrição:** `disable: process.env.NODE_ENV === 'development'` — o service worker NÃO é desabilitado em `NODE_ENV === 'test'`. Sem impacto prático (testes unitários não constroem SW), mas tecnicamente impreciso.
**Fix:** `disable: process.env.NODE_ENV !== 'production'`

---

### M3 — lighthouserc.js: `preset: 'desktop'` conflita com `formFactor: 'mobile'`

**Prioridade:** Baixa
**Origem:** Story 4.4 M3 (QA Review 2026-04-07)
**Arquivo:** `lighthouserc.js`
**Descrição:** `preset: 'desktop'` define defaults de desktop que são parcialmente sobrescritos por `formFactor: 'mobile'` e `screenEmulation` explícitos. Configuração inconsistente que pode gerar resultados unreliable.
**Status:** ✅ Corrigido em commit junto com Story 4.5 (linha `preset: 'desktop'` removida).

---

### M4 — `npm run lighthouse` usa dev server (SW desabilitado)

**Prioridade:** Baixa
**Origem:** Story 4.4 M4 (QA Review 2026-04-07)
**Arquivo:** `lighthouserc.js`
**Descrição:** `startServerCommand: 'npm run dev'` inicia Turbopack com SW desabilitado (`NODE_ENV === 'development'`). Audit PWA e performance não representam produção.
**Fix:** Usar `startServerCommand: 'npm run build && npm run start'` para audit com SW ativo.

---

## Tech Debt — Story 4.2 (LGPD, Gestão de Dados & Offline)

### m1 — a.click() sem append ao DOM no export de dados

**Prioridade:** Baixa
**Origem:** Story 4.2 m1 (QA Review 2026-04-07)
**Arquivo:** `src/app/(app)/settings/page.tsx` — `handleExport()`
**Descrição:** Download do JSON usa `a.click()` sem `document.body.appendChild(a)`. Funcional em Chrome/Android (85% do mercado-alvo), mas padrão não-canônico que pode falhar em browsers antigos.
**Fix:** `document.body.appendChild(a); a.click(); document.body.removeChild(a);`

---

### m2 — Timer de timeout do chat reinicia em transição submitted→streaming

**Prioridade:** Baixa
**Origem:** Story 4.2 m2 (QA Review 2026-04-07)
**Arquivo:** `src/app/(app)/chat/page.tsx`
**Descrição:** useEffect com `[status]` reseta o timer de 30s na transição de status. AC especifica "30s sem novos tokens" (tracking de chegada de tokens), mas implementação monitora status. Comportamento correto na prática; desvio semântico.
**Fix:** Rastrear chegada de tokens via evento do stream, não transições de status.

---

### m3 — Cache offline não implementado (AC4 parcial — Story 4.2)

**Prioridade:** Média
**Origem:** Story 4.2 m3 (QA Review 2026-04-07)
**Descrição:** Banner offline implementado mas sem: cache React Query para dashboard em modo offline; mensagem "Sem conexão" nos formulários de chat e import quando offline.
**Fix:** Configurar `staleTime` no React Query + verificação `isOnline` nos formulários.

---

### m4 — Teste de ownership ausente em DELETE /api/user/account

**Prioridade:** Baixa
**Origem:** Story 4.2 m4 (QA Review 2026-04-07)
**Arquivo:** `tests/unit/api/user-delete.test.ts`
**Descrição:** Teste de deleção não verifica que usuário A não pode deletar conta de usuário B. Proteção existe via server-side auth; falta cobertura de teste.
**Fix:** Adicionar teste documentando que queries usam user_id do auth context, não de parâmetros da request.

---

## Tech Debt — Ciclo 2 QA (C2.1 + C2.2)

### mn3 — Tiebreaker inconsistente entre Edge Function e API GET

**Prioridade:** Baixa
**Origem:** C2.1 QA Gate — MINOR mn3 (2026-04-17)
**Arquivo:** `supabase/functions/categorize-import/index.ts` (Edge) vs `src/app/api/rules/route.ts` (API GET)
**Descrição:** Edge Function usa `created_at DESC` (regra mais nova vence em empate de prioridade), mas API GET usa `created_at ASC` (regra mais antiga vence). Usuário que cria duas regras com a mesma prioridade pode ver comportamento diferente entre a prévia na UI e o import real.
**Fix:** Alinhar ambos para `created_at ASC` (mais antiga vence — comportamento mais previsível) ou DESC com consistência end-to-end.

---

### mn1 — Reajustes >5% causam desaparecimento temporário da detecção

**Prioridade:** Baixa
**Origem:** C2.2 QA Gate — MINOR mn1 (2026-04-17)
**Arquivo:** `src/lib/subscriptions/detect-subscriptions.ts` — `analyzeGroup()`
**Descrição:** `similarityBase` é ancorado em `amounts[0]` (transação mais antiga). Quando uma assinatura sofre reajuste >5%, o novo valor fica fora da janela de similaridade em relação à base histórica, fazendo o grupo falhar o gate de 60% e desaparecer da detecção. O problema é auto-resolutivo quando os registros antigos saem da janela de 180 dias.
**Fix:** Usar mediana dos valores ou calcular similaridade em relação ao valor mais recente em vez do mais antigo.

---

## Tech Debt — Ciclo 2 QA (C2.3)

### mn2 — History endpoint retorna os 6 mais antigos em vez dos 6 mais recentes

**Prioridade:** Baixa (impacto zero até mês 7 de operação)
**Origem:** C2.3 QA Gate — MINOR mn2 (2026-04-17)
**Arquivo:** `src/app/api/health-score/history/route.ts`
**Descrição:** `.order('month', { ascending: true }).limit(6)` retorna os 6 registros mais antigos de `health_score_history`. Para usuários com >6 meses de histórico, o mini gráfico do HealthScoreCard mostraria os meses mais antigos em vez dos mais recentes. Sem impacto no MVP — nenhum usuário tem >6 meses de dados. Bug torna-se visível no 7º mês de operação.
**Fix:** Alterar para `.order('month', { ascending: false }).limit(6)` e reverter o array antes de retornar (já implementado em `4eead00+1`).

---

### mn5 — Erro de fetch conflateado com estado vazio no HealthScoreCard

**Prioridade:** Baixa
**Origem:** C2.3 QA Gate — MINOR mn5 (2026-04-17)
**Arquivo:** `src/components/dashboard/health-score-card.tsx` — catch block (linha ~55)
**Descrição:** Quando a chamada a `/api/health-score` falha (erro de rede, 500, etc.), o componente exibe "Importe transações para ver seu score de saúde" em vez de uma mensagem de erro. Usuário não consegue distinguir falha de rede de ausência de dados.
**Fix:** Adicionar estado `error: boolean` ao componente. No catch block, setar `error = true`. Renderizar mensagem de erro distinta ("Não foi possível carregar o score. Tente novamente.") quando `error === true`.


---

## Tech Debt — Ciclo 2 QA (C2.5 — Categorização IRPF)

### C2.5-mn1 — Campo `total_deductible` ausente na resposta de `/api/irpf`

**Prioridade:** Baixa
**Origem:** C2.5 QA Gate — MINOR mn1 (2026-04-17)
**Arquivo:** `src/app/api/irpf/route.ts`
**Descrição:** AC1 especifica `"total_deductible": 5450.00` na estrutura JSON de resposta. O endpoint retorna `{ year, saude, educacao }` sem o campo agregado. A UI não consome esse campo, sem impacto funcional. Divergência do contrato de API especificado.
**Fix:** Calcular e adicionar ao retorno: `total_deductible: saude.total + Math.min(educacao.total, educationLimit ?? educacao.total)`.

---

### C2.5-mn2 — Seletor de ano não inclui o ano atual — ✅ Corrigido em commit pós-QA

**Prioridade:** Baixa (já corrigido)
**Origem:** C2.5 QA Gate — MINOR mn2 (2026-04-17)
**Arquivo:** `src/app/(app)/more/irpf/page.tsx`
**Descrição:** `Array.from({ length: currentYear - 2022 }, ...)` gerava anos de `currentYear-1` para trás, excluindo o ano corrente. Usuário com transações de saúde/educação no ano atual não conseguia consultar.
**Fix aplicado:** `Array.from({ length: currentYear - 2022 + 1 }, (_, i) => currentYear - i)` — inclui o ano corrente.

---

### C2.5-mn3 — Texto do empty state mais curto que o especificado no AC4

**Prioridade:** Baixa
**Origem:** C2.5 QA Gate — MINOR mn3 (2026-04-17)
**Arquivo:** `src/app/(app)/more/irpf/page.tsx`
**Descrição:** AC4 especifica: *"Nenhuma despesa de saúde ou educação categorizada em [ano]. Verifique se as transações foram categorizadas corretamente na tela de Transações."* Implementação usa "Nenhuma despesa dedutível em {year}" sem a orientação de verificação de categorias.
**Fix:** Expandir o texto do empty state para incluir a orientação de verificação conforme o AC.

---

### C2.5-mn4 — `window.open()` para download pode ser bloqueado por popup blockers — ✅ Corrigido em commit pós-QA

**Prioridade:** Baixa (já corrigido)
**Origem:** C2.5 QA Gate — MINOR mn4 (2026-04-17)
**Arquivo:** `src/app/(app)/more/irpf/page.tsx`
**Descrição:** Botões de exportação CSV e PDF usavam `window.open()` que pode ser bloqueado por popup blockers em Safari e Firefox com strict mode, causando falha silenciosa no download.
**Fix aplicado:** Substituído por elemento `<a>` com `href` e atributo `download` — padrão canônico para download de arquivos.
