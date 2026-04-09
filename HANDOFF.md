# Handoff — Fase 1: Parcelas, Agendamentos, Orçamentos

**Data:** 2026-04-09  
**Branch:** dev  
**Objetivo:** Evoluir o Finansim para competir com Mobills, Organizze, Monarch Money.

---

## O que foi implementado (Fase 1 — ~95% completo)

### Arquivos NOVOS criados

| Arquivo | Descrição |
|---------|-----------|
| `supabase/migrations/012_financial_planning.sql` | Schema: installment_groups, recurring_rules, scheduled_transactions + colunas extras em transactions |
| `src/lib/installments/detector.ts` | Detecta padrões de parcelas em descrições (3/10, PARCELA 3 DE 10) |
| `src/lib/installments/generator.ts` | Gera parcelas futuras como scheduled_transactions |
| `src/app/api/scheduled/route.ts` | GET + POST de agendamentos |
| `src/app/api/scheduled/[id]/route.ts` | PATCH + DELETE de agendamento |
| `src/app/api/scheduled/[id]/pay/route.ts` | POST: marcar como pago + criar transação real |
| `src/app/api/installment-groups/route.ts` | GET + POST de grupos de parcelas |
| `src/app/api/installment-groups/[id]/route.ts` | GET + DELETE |
| `src/app/api/budgets/route.ts` | GET (com gastos calculados) + POST/upsert |
| `src/app/api/budgets/[id]/route.ts` | PATCH + DELETE |
| `src/app/api/goals/route.ts` | GET + POST |
| `src/app/api/goals/[id]/route.ts` | PATCH + DELETE |
| `src/hooks/use-scheduled-transactions.ts` | Hook CRUD agendamentos |
| `src/hooks/use-installment-groups.ts` | Hook CRUD grupos de parcelas |
| `src/hooks/use-budgets.ts` | Hook CRUD orçamentos + gasto real |
| `src/components/layout/action-sheet.tsx` | FAB central + ActionSheet com 4 ações |
| `src/components/financeiro/sub-nav.tsx` | Tab bar horizontal para /financeiro |
| `src/components/financeiro/scheduled-item.tsx` | Item individual de agendamento |
| `src/components/financeiro/scheduled-list.tsx` | Lista de agendamentos |
| `src/components/financeiro/scheduled-form.tsx` | Sheet form para criar agendamento |
| `src/components/financeiro/contas-summary.tsx` | Cards resumo: a pagar, a receber, saldo |
| `src/components/financeiro/installment-group-card.tsx` | Card de grupo de parcelas com progress |
| `src/components/budgets/budget-progress-card.tsx` | Card de orçamento com barra de progresso |
| `src/components/budgets/budget-form.tsx` | Sheet form para criar/editar orçamento |
| `src/app/(app)/financeiro/page.tsx` | Redireciona para /financeiro/contas |
| `src/app/(app)/financeiro/layout.tsx` | Layout com FinanceiroSubNav |
| `src/app/(app)/financeiro/contas/page.tsx` | Página contas a pagar/receber |
| `src/app/(app)/financeiro/parcelas/page.tsx` | Página gestão de parcelas |
| `src/app/(app)/more/page.tsx` | Hub "Mais" (Chat, Orçamentos, Importar, Config) |
| `src/app/(app)/more/orcamentos/page.tsx` | Página orçamentos |
| `src/app/(app)/more/objetivos/page.tsx` | Página objetivos |
| `src/components/ui/progress.tsx` | shadcn progress (instalado) |
| `src/components/ui/tabs.tsx` | shadcn tabs (instalado) |
| `src/components/ui/switch.tsx` | shadcn switch (instalado) |
| `tests/unit/installments/detector.test.ts` | Testes do detector |
| `tests/unit/installments/generator.test.ts` | Testes do generator |

### Arquivos MODIFICADOS

| Arquivo | O que mudou |
|---------|-------------|
| `src/components/layout/bottom-nav.tsx` | Nova estrutura: Início, Transações, FAB, Financeiro, Mais |
| `src/app/api/import/route.ts` | Detecção de parcelas na Etapa 5.5 (entre parse e insert) |
| `src/lib/billing/plans.ts` | Novos limites: maxBudgetCategories, maxRecurringRules, maxGoals, cashFlowMonthsAhead |
| `src/hooks/use-plan.ts` | Novas capabilities: maxBudgetCategories, maxRecurringRules, maxGoals, cashFlowMonthsAhead, canUseRecurringAutoDetect |

---

## ÚNICO PENDENTE: Build TypeScript falhando

### Causa raiz
`src/lib/supabase/types.ts` está **desatualizado** — não inclui as novas tabelas:
- `installment_groups`
- `recurring_rules`
- `scheduled_transactions`

Isso faz com que `supabase.from('nova_tabela')` retorne tipo `never`, causando erros de TypeScript.

### Solução correta (1 comando)
```bash
supabase gen types typescript --local > src/lib/supabase/types.ts
```

**Pré-requisito:** Supabase local deve estar rodando. Iniciar com:
```bash
supabase start
supabase db push  # aplica a migration 012
supabase gen types typescript --local > src/lib/supabase/types.ts
```

### Solução alternativa (sem Supabase local)
Se não puder rodar o Supabase local agora, substituir as chamadas problemáticas nas rotas. Os arquivos que ainda têm erros de tipo são:

- `src/app/api/scheduled/[id]/pay/route.ts` — linhas com `.from('scheduled_transactions')`
- `src/app/api/scheduled/[id]/route.ts` — idem
- `src/app/api/scheduled/route.ts` — idem

**Fix rápido para cada arquivo:** substituir `supabase` por `(supabase as any)` nas queries das novas tabelas. Exemplo:
```typescript
// Antes:
const { data } = await supabase
  .from('scheduled_transactions')
  .select('*')

// Depois:
const { data } = await (supabase as any)
  .from('scheduled_transactions')
  .select('*')
```

Os arquivos de budgets/goals já foram corrigidos com esse padrão. Faltam apenas os 3 arquivos de scheduled acima.

---

## Quality Gate — Status atual

```
✅ npm run lint     → zero erros/warnings
❌ npm run build    → falha em 3 arquivos (tipos Supabase desatualizados)
⬜ npm test         → não rodado ainda
```

### Para completar o quality gate:
```bash
# Opção A (recomendado):
supabase start && supabase db push
supabase gen types typescript --local > src/lib/supabase/types.ts
npm run lint && npm run build && npm test

# Opção B (sem Supabase local):
# Corrigir manualmente os 3 arquivos acima e rodar:
npm run lint && npm run build && npm test
```

---

## Fase 2 — Próximas implementações

Após o quality gate passar, implementar:

### 2.1 Detecção automática de recorrência
- `src/lib/recurring/detector.ts` — algoritmo que analisa 6 meses de histórico
- `src/lib/recurring/generator.ts` — gera instâncias de regras recorrentes
- `src/app/api/recurring-rules/route.ts` — CRUD
- `src/app/api/recurring-rules/detect/route.ts` — POST: roda detecção
- Página `/financeiro/recorrentes` (sub-nav já tem o link)

### 2.2 Projeção de fluxo de caixa
- `src/lib/cashflow/projector.ts` — calcula saldo projetado dia-a-dia
- `src/app/api/cashflow/route.ts` — GET com período
- `src/components/financeiro/cash-flow-chart.tsx` — gráfico de linha
- Página `/financeiro/fluxo` (sub-nav já tem o link)

### 2.3 Dashboard melhorado
- `src/components/dashboard/upcoming-bills-card.tsx` — próximas contas
- Modificar `src/app/(app)/dashboard/page.tsx` — adicionar cards

### 2.4 Novos tools para chat IA (Pro)
- Modificar `src/lib/ai/tools/index.ts` — adicionar `list_scheduled_transactions`, `get_cash_flow_projection`

### 2.5 Feature gating (já no plans.ts, mas implementar verificações)
- Basic: 5 regras recorrentes, 1 mês de projeção
- Pro: ilimitado, 12 meses de projeção, detecção automática

---

## Fase 3 — Nice-to-have

- Safe-to-spend no dashboard (saldo - despesas pendentes do mês)
- Net worth tracking (migration 013: account_type + initial_balance)
- Alertas de contas (Edge Function diária + web push Pro)
- Analytics avançado (tendências multi-mês, recorrente vs pontual)

---

## Arquitetura de dados implementada

```
installment_groups (grupo de parcelas)
  └── scheduled_transactions (parcelas futuras, ON DELETE CASCADE)
  └── transactions.installment_group_id (parcela importada)

recurring_rules (regra de recorrência)
  └── scheduled_transactions.recurring_rule_id
  └── transactions.recurring_rule_id

scheduled_transactions (agendamentos)
  ├── status: pending | paid | overdue | canceled
  ├── paid_transaction_id → transactions (quando pago)
  └── installment_group_id + installment_number
```

---

## Navegação após a mudança

```
Bottom Nav: Início | Transações | [FAB +] | Financeiro | Mais

FAB abre ActionSheet:
  ├── Importar Extrato → /import
  ├── Nova Transação → abre TransactionForm
  ├── Agendar Conta → abre ScheduledForm
  └── Nova Parcela → abre InstallmentForm (TODO)

/financeiro (layout com sub-nav):
  ├── /financeiro/contas — a pagar/receber, summary cards
  ├── /financeiro/parcelas — grupos de parcelas detectados
  ├── /financeiro/recorrentes — (Fase 2)
  └── /financeiro/fluxo — (Fase 2)

/more:
  ├── /chat
  ├── /more/orcamentos
  ├── /more/objetivos
  ├── /import
  └── /settings
```
