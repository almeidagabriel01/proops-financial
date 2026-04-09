# Fase 3 — Nice-to-have

Features desejadas após a conclusão das Fases 1 e 2.

---

## 3.1 Safe-to-Spend no Dashboard

**O que é:** Mostrar quanto o usuário pode gastar "com segurança" hoje.

**Cálculo:** `saldo atual − total de despesas agendadas pendentes no mês corrente`

**Implementação:**
- Nenhuma migration necessária — usa dados já existentes (`transactions` + `scheduled_transactions`)
- Adicionar função `calcSafeToSpend(userId)` em `src/lib/cashflow/`
- Novo card no dashboard (`src/components/dashboard/safe-to-spend-card.tsx`)
- Busca server-side junto com os outros dados do `dashboard/page.tsx`

---

## 3.2 Net Worth Tracking

**O que é:** Patrimônio líquido do usuário com evolução histórica.

**Cálculo:** Soma de `(saldo_inicial + transações)` por conta bancária

**Implementação:**
- Migration 013: adicionar `account_type` (`checking | savings | investment | credit`) e `initial_balance` em `bank_accounts`
- `src/lib/networth/calculator.ts` — calcula net worth por conta e total
- `src/app/api/networth/route.ts` — GET com snapshot histórico
- `src/components/dashboard/net-worth-card.tsx` — card com valor total + mini gráfico de evolução
- Página opcional `/more/patrimonio`

---

## 3.3 Alertas de Contas (Bill Reminders)

**O que é:** Notificação proativa quando uma conta está vencendo em 1–3 dias.

**Implementação:**
- Supabase Edge Function diária (`supabase/functions/bill-reminders/index.ts`):
  1. Busca `scheduled_transactions` com `due_date` entre hoje e D+3 e `status = 'pending'`
  2. Marca `status = 'overdue'` para `due_date < today`
  3. Envia web push para usuários Pro (via `web-push` library)
- Migration: tabela `push_subscriptions` para armazenar endpoint + keys do browser
- Frontend: solicitar permissão de notificação em `settings/page.tsx` (Pro only)
- Feature flag: `canReceivePushAlerts` em `src/lib/billing/plans.ts`

---

## 3.4 Analytics Avançado

**O que é:** Análises multi-mês além do comparativo simples atual.

**Implementação:**
- `src/app/api/analytics/trends/route.ts` — GET com período (trimestre/semestre/ano)
  - Breakdown: recorrente vs pontual por categoria
  - Tendência de crescimento/queda por categoria
  - Projeção baseada em média dos últimos N meses
- `src/components/dashboard/trend-chart.tsx` — gráfico de barras empilhadas multi-mês
- `src/app/(app)/more/analytics/page.tsx` — página dedicada (Pro)

---

## Prioridade Sugerida

| Feature | Impacto | Esforço | Prioridade |
|---------|---------|---------|-----------|
| Safe-to-Spend | Alto | Baixo | ⭐⭐⭐ |
| Alertas de Contas | Alto | Médio | ⭐⭐⭐ |
| Net Worth | Médio | Médio | ⭐⭐ |
| Analytics Avançado | Médio | Alto | ⭐ |
